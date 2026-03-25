import { format, parse } from "date-fns";
import type { Locale } from "date-fns";
import * as dateFnsLocales from "date-fns/locale";

type DailyNotePathParseSettings = {
	useDailyNotePathAsDate: boolean;
	dailyNoteFormat: string;
	dailyNotePath: string;
};

type FormatSegment = {
	type: "token" | "literal";
	value: string;
	category?: string;
};

function getSystemLocaleCodes(): string[] {
	const navigatorLocales =
		typeof navigator !== "undefined"
			? [
					...(navigator.languages || []),
					navigator.language,
			  ].filter((locale): locale is string => Boolean(locale))
			: [];

	const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
	return [...new Set([...navigatorLocales, intlLocale, "en-US"])];
}

function getLocaleCandidates(localeCode: string): string[] {
	const normalized = localeCode.replace(/_/g, "-");
	const parts = normalized.split("-").filter(Boolean);
	if (parts.length === 0) return [];

	const candidates = new Set<string>();
	candidates.add(normalized);
	candidates.add(normalized.toLowerCase());
	candidates.add(parts[0].toLowerCase());

	const camelCase = [
		parts[0].toLowerCase(),
		...parts.slice(1).map((part) =>
			part.length <= 3
				? part.toUpperCase()
				: part[0].toUpperCase() + part.slice(1).toLowerCase(),
		),
	].join("");
	candidates.add(camelCase);

	return [...candidates];
}

function resolveSystemLocale(): Locale | undefined {
	for (const localeCode of getSystemLocaleCodes()) {
		for (const candidate of getLocaleCandidates(localeCode)) {
			const locale = (dateFnsLocales as Record<string, Locale | undefined>)[
				candidate
			];
			if (locale) {
				return locale;
			}
		}
	}

	return undefined;
}

function categorizeToken(token: string): string | undefined {
	if (/^[yYuR]+$/.test(token)) return "year";
	if (/^[ML]+$/.test(token)) return "month";
	if (/^d+$/.test(token)) return "dayOfMonth";
	if (/^[Eeci]+$/.test(token)) return "weekday";
	return undefined;
}

function tokenizeFormat(formatString: string): FormatSegment[] {
	const segments: FormatSegment[] = [];
	let index = 0;

	while (index < formatString.length) {
		const char = formatString[index];

		if (char === "'") {
			let literal = "";
			index += 1;

			while (index < formatString.length) {
				if (formatString[index] === "'") {
					if (formatString[index + 1] === "'") {
						literal += "'";
						index += 2;
						continue;
					}
					index += 1;
					break;
				}

				literal += formatString[index];
				index += 1;
			}

			if (literal) {
				segments.push({ type: "literal", value: literal });
			}
			continue;
		}

		if (/[A-Za-z]/.test(char)) {
			let end = index + 1;
			while (end < formatString.length && formatString[end] === char) {
				end += 1;
			}

			const token = formatString.slice(index, end);
			segments.push({
				type: "token",
				value: token,
				category: categorizeToken(token),
			});
			index = end;
			continue;
		}

		segments.push({ type: "literal", value: char });
		index += 1;
	}

	return segments;
}

function buildSegmentPattern(segment: FormatSegment): string {
	if (segment.type === "literal") {
		return segment.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	const token = segment.value;

	if (/^y+$/.test(token)) return token.length === 2 ? "(\\d{2})" : "(\\d{4})";
	if (/^(d|M)$/.test(token)) return "(\\d{1,2})";
	if (/^(MM|dd)$/.test(token)) return "(\\d{2})";
	if (/^MMM+$/.test(token) || /^[Eeci]+$/.test(token)) return "(.+?)";

	return "(.+?)";
}

function simplifyFormatMatch(
	pathToMatch: string,
	formatString: string,
): { simplifiedInput: string; simplifiedFormat: string } | undefined {
	const segments = tokenizeFormat(formatString);
	const regexParts: string[] = [];

	for (const segment of segments) {
		regexParts.push(buildSegmentPattern(segment));
	}

	const match = new RegExp(`^${regexParts.join("")}$`, "u").exec(pathToMatch);
	if (!match) return undefined;

	const seenCategories = new Set<string>();
	const keptInputs: string[] = [];
	const keptFormats: string[] = [];
	let pendingLiteral = "";
	let tokenIndex = 1;

	for (const segment of segments) {
		if (segment.type === "literal") {
			pendingLiteral += segment.value;
			continue;
		}

		const isDuplicateCategory =
			segment.category && seenCategories.has(segment.category);
		if (!isDuplicateCategory) {
			if (keptInputs.length > 0) {
				keptInputs.push(pendingLiteral);
				keptFormats.push(pendingLiteral);
			}
			keptInputs.push(match[tokenIndex]);
			keptFormats.push(segment.value);
			if (segment.category) {
				seenCategories.add(segment.category);
			}
		}

		pendingLiteral = "";
		tokenIndex += 1;
	}

	return {
		simplifiedInput: keptInputs.join(""),
		simplifiedFormat: keptFormats.join(""),
	};
}

function parseWithLocale(
	input: string,
	formatString: string,
	locale: Locale | undefined,
): Date {
	return parse(input, formatString, new Date(), locale ? { locale } : undefined);
}

export function parseDailyNotePathDate(
	filePath: string,
	settings: DailyNotePathParseSettings,
): number | undefined {
	if (!settings.useDailyNotePathAsDate) return undefined;

	const locale = resolveSystemLocale();

	function tryParse(pathValue: string, dailyNotePath: string): number | undefined {
		let pathToMatch = pathValue.replace(/\.[^/.]+$/, "");

		if (dailyNotePath && pathToMatch.startsWith(dailyNotePath)) {
			pathToMatch = pathToMatch.substring(dailyNotePath.length);
			if (pathToMatch.startsWith("/")) {
				pathToMatch = pathToMatch.substring(1);
			}
		}

		const simplifiedMatch = simplifyFormatMatch(
			pathToMatch,
			settings.dailyNoteFormat,
		);
		const parseInput = simplifiedMatch?.simplifiedInput ?? pathToMatch;
		const parseFormat =
			simplifiedMatch?.simplifiedFormat ?? settings.dailyNoteFormat;

		try {
			const dateFromPath = parseWithLocale(parseInput, parseFormat, locale);
			if (!isNaN(dateFromPath.getTime())) {
				const roundTrip = format(
					dateFromPath,
					settings.dailyNoteFormat,
					locale ? { locale } : undefined,
				);
				if (roundTrip === pathToMatch) {
					return dateFromPath.getTime();
				}
			}
		} catch {
			// Ignore and continue with recursive fallback below.
		}

		if (pathToMatch.includes("/")) {
			return tryParse(
				pathToMatch.substring(pathToMatch.indexOf("/") + 1),
				"",
			);
		}

		return undefined;
	}

	return tryParse(filePath, settings.dailyNotePath);
}

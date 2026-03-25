import { parseDailyNotePathDate } from "../utils/date/daily-note-path-parser";

describe("parseDailyNotePathDate", () => {
	const originalLanguage = navigator.language;
	const originalLanguages = navigator.languages;

	function mockSystemLocale(locale: string, locales = [locale]) {
		Object.defineProperty(window.navigator, "language", {
			configurable: true,
			value: locale,
		});
		Object.defineProperty(window.navigator, "languages", {
			configurable: true,
			value: locales,
		});
	}

	afterEach(() => {
		Object.defineProperty(window.navigator, "language", {
			configurable: true,
			value: originalLanguage,
		});
		Object.defineProperty(window.navigator, "languages", {
			configurable: true,
			value: originalLanguages,
		});
	});

	test("parses the default numeric daily note format", () => {
		mockSystemLocale("en-US");

		const timestamp = parseDailyNotePathDate("Daily/2026-03-24.md", {
			useDailyNotePathAsDate: true,
			dailyNoteFormat: "yyyy-MM-dd",
			dailyNotePath: "Daily",
		});

		expect(timestamp).toBe(new Date(2026, 2, 24).getTime());
	});

	test("parses duplicated date fields in English using the system locale", () => {
		mockSystemLocale("en-US");

		const timestamp = parseDailyNotePathDate(
			"Daily/2026-03-24 Tuesday 24 March.md",
			{
				useDailyNotePathAsDate: true,
				dailyNoteFormat: "yyyy-MM-dd EEEE dd MMMM",
				dailyNotePath: "Daily",
			},
		);

		expect(timestamp).toBe(new Date(2026, 2, 24).getTime());
	});

	test("parses duplicated date fields in French using the system locale", () => {
		mockSystemLocale("fr-FR");

		const timestamp = parseDailyNotePathDate(
			"Notes quotidiennes/2026-03-24 mardi 24 mars.md",
			{
				useDailyNotePathAsDate: true,
				dailyNoteFormat: "yyyy-MM-dd EEEE dd MMMM",
				dailyNotePath: "Notes quotidiennes",
			},
		);

		expect(timestamp).toBe(new Date(2026, 2, 24).getTime());
	});

	test("rejects inconsistent duplicated date fields", () => {
		mockSystemLocale("fr-FR");

		const timestamp = parseDailyNotePathDate(
			"Notes quotidiennes/2026-03-24 mardi 25 mars.md",
			{
				useDailyNotePathAsDate: true,
				dailyNoteFormat: "yyyy-MM-dd EEEE dd MMMM",
				dailyNotePath: "Notes quotidiennes",
			},
		);

		expect(timestamp).toBeUndefined();
	});
});

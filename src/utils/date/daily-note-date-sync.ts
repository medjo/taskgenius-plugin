import type { Task } from "@/types/task";
import { formatDate as formatDateSmart } from "@/utils/date/date-utils";

type MetadataFormat = "dataview" | "tasks";
type DateType = "due" | "start" | "scheduled";

export interface DailyNoteDateSyncResult {
	content: string;
	changed: boolean;
	changedLineCount: number;
}

function getDateTypeForTask(task: Task): DateType | undefined {
	const dateType = task.metadata?.useAsDateType;
	return dateType === "due" || dateType === "start" || dateType === "scheduled"
		? dateType
		: undefined;
}

function getDateValueForTask(task: Task, dateType: DateType): number | undefined {
	switch (dateType) {
		case "due":
			return task.metadata?.dueDate;
		case "start":
			return task.metadata?.startDate;
		case "scheduled":
			return task.metadata?.scheduledDate;
	}
}

function hasDateToken(line: string, dateType: DateType): boolean {
	switch (dateType) {
		case "due":
			return /(\[due::\s*[^\]]+\]|📅\s*\S+)/i.test(line);
		case "start":
			return /(\[start::\s*[^\]]+\]|🛫\s*\S+|🚀\s*\S+)/i.test(line);
		case "scheduled":
			return /(\[scheduled::\s*[^\]]+\]|⏳\s*\S+|⏰\s*\S+)/i.test(line);
	}
}

function buildDateToken(
	dateType: DateType,
	timestamp: number,
	preferMetadataFormat: MetadataFormat,
): string | undefined {
	const dateStr = formatDateSmart(timestamp, { includeSeconds: false });
	if (!dateStr) return undefined;

	if (preferMetadataFormat === "dataview") {
		switch (dateType) {
			case "due":
				return `[due:: ${dateStr}]`;
			case "start":
				return `[start:: ${dateStr}]`;
			case "scheduled":
				return `[scheduled:: ${dateStr}]`;
		}
	}

	switch (dateType) {
		case "due":
			return `📅 ${dateStr}`;
		case "start":
			return `🛫 ${dateStr}`;
		case "scheduled":
			return `⏳ ${dateStr}`;
	}
}

export function syncDailyNoteDerivedDatesToTaskLines(
	content: string,
	tasks: Task[],
	preferMetadataFormat: MetadataFormat,
): DailyNoteDateSyncResult {
	const lines = content.split("\n");
	let changedLineCount = 0;

	for (const task of tasks) {
		if (task.line < 0 || task.line >= lines.length) continue;

		const dateType = getDateTypeForTask(task);
		if (!dateType) continue;

		const timestamp = getDateValueForTask(task, dateType);
		if (!timestamp) continue;

		const line = lines[task.line];
		if (!line || hasDateToken(line, dateType)) continue;

		const token = buildDateToken(dateType, timestamp, preferMetadataFormat);
		if (!token) continue;

		lines[task.line] = `${line.trimEnd()} ${token}`;
		task.originalMarkdown = lines[task.line];
		changedLineCount += 1;
	}

	return {
		content: lines.join("\n"),
		changed: changedLineCount > 0,
		changedLineCount,
	};
}

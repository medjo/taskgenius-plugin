import type { Task } from "../types/task";
import { syncDailyNoteDerivedDatesToTaskLines } from "../utils/date/daily-note-date-sync";
import { formatDate as formatDateSmart } from "../utils/date/date-utils";

function createTask(
	overrides: Omit<Partial<Task>, "metadata"> & {
		line: number;
		originalMarkdown: string;
		filePath?: string;
		metadata?: Record<string, any>;
	},
): Task {
	return {
		id: overrides.id || `task-${overrides.line}`,
		content: overrides.content || "Test task",
		filePath: overrides.filePath || "Daily/2026-03-24.md",
		line: overrides.line,
		completed: overrides.completed || false,
		status: overrides.status || " ",
		originalMarkdown: overrides.originalMarkdown,
		metadata: {
			tags: [],
			children: [],
			...(overrides.metadata || {}),
		},
	};
}

describe("syncDailyNoteDerivedDatesToTaskLines", () => {
	const derivedDate = new Date(2026, 2, 24).getTime();
	const formattedDerivedDate = formatDateSmart(derivedDate, {
		includeSeconds: false,
	});

	test("adds a Dataview due date for tasks derived from the daily note path", () => {
		const content = ["- [ ] Review PR", "- [ ] Ship release"].join("\n");
		const tasks = [
			createTask({
				line: 0,
				originalMarkdown: "- [ ] Review PR",
				metadata: {
					dueDate: derivedDate,
					useAsDateType: "due",
				},
			}),
		];

		const result = syncDailyNoteDerivedDatesToTaskLines(
			content,
			tasks,
			"dataview",
		);

		expect(result.changed).toBe(true);
		expect(result.changedLineCount).toBe(1);
		expect(result.content).toContain(
			`- [ ] Review PR [due:: ${formattedDerivedDate}]`,
		);
		expect(tasks[0].originalMarkdown).toBe(
			`- [ ] Review PR [due:: ${formattedDerivedDate}]`,
		);
	});

	test("does not duplicate an existing inline date token", () => {
		const content = "- [ ] Review PR [due:: 2026-03-24]";
		const tasks = [
			createTask({
				line: 0,
				originalMarkdown: `- [ ] Review PR [due:: ${formattedDerivedDate}]`,
				metadata: {
					dueDate: derivedDate,
					useAsDateType: "due",
				},
			}),
		];

		const result = syncDailyNoteDerivedDatesToTaskLines(
			content,
			tasks,
			"dataview",
		);

		expect(result.changed).toBe(false);
		expect(result.changedLineCount).toBe(0);
		expect(result.content).toBe(content);
	});

	test("adds a Tasks-format scheduled date when configured", () => {
		const content = "- [ ] Review PR";
		const tasks = [
			createTask({
				line: 0,
				originalMarkdown: "- [ ] Review PR",
				metadata: {
					scheduledDate: derivedDate,
					useAsDateType: "scheduled",
				},
			}),
		];

		const result = syncDailyNoteDerivedDatesToTaskLines(content, tasks, "tasks");

		expect(result.changed).toBe(true);
		expect(result.content).toBe(`- [ ] Review PR ⏳ ${formattedDerivedDate}`);
	});
});

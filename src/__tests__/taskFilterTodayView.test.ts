jest.mock("obsidian", () => {
	const actualMoment = require("moment");
	return {
		moment: actualMoment,
	};
});

import { DEFAULT_SETTINGS } from "../common/setting-definition";
import { filterTasks } from "../utils/task/task-filter-utils";
import type { Task } from "../types/task";

function createTask(
	id: string,
	metadata: Partial<Task["metadata"]>,
	completed = false,
): Task {
	return {
		id,
		content: id,
		filePath: `${id}.md`,
		line: 0,
		completed,
		status: completed ? "x" : " ",
		originalMarkdown: `- [${completed ? "x" : " "}] ${id}`,
		metadata: {
			tags: [],
			children: [],
			...metadata,
		},
	};
}

describe("Today view filtering", () => {
	test("includes tasks due today and overdue, but excludes future tasks", () => {
		const now = new Date();
		const today = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			12,
			0,
			0,
		).getTime();
		const yesterday = today - 24 * 60 * 60 * 1000;
		const tomorrow = today + 24 * 60 * 60 * 1000;

		const tasks = [
			createTask("due-today", { dueDate: today }),
			createTask("due-overdue", { dueDate: yesterday }),
			createTask("scheduled-overdue", { scheduledDate: yesterday }),
			createTask("start-overdue", { startDate: yesterday }),
			createTask("future", { dueDate: tomorrow }),
		];

		const plugin = {
			settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
		} as any;

		const result = filterTasks(tasks, "today" as any, plugin);
		const resultIds = result.map((task) => task.id);

		expect(resultIds).toContain("due-today");
		expect(resultIds).toContain("due-overdue");
		expect(resultIds).toContain("scheduled-overdue");
		expect(resultIds).toContain("start-overdue");
		expect(resultIds).not.toContain("future");
	});
});

import { DEFAULT_SETTINGS } from "../common/setting-definition";
import {
	ensureDefaultStatusCycle,
	applyStatusThemeToSettings,
	appendStatusThemeCycle,
	getStatusThemeStatuses,
} from "../utils/status-theme-settings";
import { getNextStatus } from "../utils/status-cycle-resolver";

function createSettings() {
	return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

describe("status theme settings", () => {
	test("resolves LYTMode through the explicit theme map", () => {
		const statuses = getStatusThemeStatuses("LYTMode");

		expect(statuses).not.toBeNull();
		expect(statuses?.some(([symbol]) => symbol === "/")).toBe(true);
	});

	test("applyStatusThemeToSettings overwrites both core statuses and the default cycle", () => {
		const settings = createSettings();
		settings.statusCycles = [
			{
				...settings.statusCycles[0],
				name: "Old Cycle",
				cycle: ["OLD"],
				marks: { OLD: "o" },
			},
		];

		const applied = applyStatusThemeToSettings(settings, "Aura");

		expect(applied).toBe(true);
		expect(settings.taskStatusMarks["complete"]).toBe("x");
		expect(settings.taskStatuses.inProgress).toContain("/");
		expect(settings.taskStatusCycle).toContain("incomplete");
		expect(settings.statusCycles).toHaveLength(1);
		expect(settings.statusCycles[0].name).toBe("Aura");
		expect(settings.statusCycles[0].cycle).toContain("incomplete");
	});

	test("applyStatusThemeToSettings restores the built-in default theme", () => {
		const settings = createSettings();
		applyStatusThemeToSettings(settings, "Aura");

		const applied = applyStatusThemeToSettings(settings, "Default");

		expect(applied).toBe(true);
		expect(settings.taskStatuses).toEqual(DEFAULT_SETTINGS.taskStatuses);
		expect(settings.taskStatusCycle).toEqual(DEFAULT_SETTINGS.taskStatusCycle);
		expect(settings.taskStatusMarks).toEqual(DEFAULT_SETTINGS.taskStatusMarks);
		expect(settings.statusCycles).toEqual(DEFAULT_SETTINGS.statusCycles);
	});

	test("appendStatusThemeCycle adds a new enabled cycle and updates task status categories", () => {
		const settings = createSettings();
		const initialLength = settings.statusCycles.length;

		const newCycle = appendStatusThemeCycle(settings, "ITS");

		expect(newCycle).not.toBeNull();
		expect(settings.statusCycles).toHaveLength(initialLength + 1);
		expect(settings.statusCycles[initialLength].name).toBe("ITS");
		expect(settings.statusCycles[initialLength].enabled).toBe(true);
		expect(settings.taskStatuses.completed).toContain("x");
	});

	test("ensureDefaultStatusCycle recreates the default cycle from legacy settings", () => {
		const settings = createSettings();
		settings.statusCycles = [];
		settings.taskStatusCycle = ["TODO", "DONE"];
		settings.taskStatusMarks = { TODO: " ", DONE: "x" };
		settings.excludeMarksFromCycle = ["DONE"];

		const cycle = ensureDefaultStatusCycle(settings);

		expect(settings.statusCycles).toHaveLength(1);
		expect(cycle.name).toBe("Default Cycle");
		expect(cycle.cycle).toEqual(["TODO", "DONE"]);
		expect(cycle.excludeFromCycle).toEqual(["DONE"]);
	});

	test("getNextStatus skips statuses excluded from click-cycling", () => {
		const result = getNextStatus(" ", {
			id: "c1",
			name: "Cycle",
			priority: 0,
			cycle: ["TODO", "WAITING", "DONE"],
			marks: {
				TODO: " ",
				WAITING: "w",
				DONE: "x",
			},
			excludeFromCycle: ["WAITING"],
			enabled: true,
		});

		expect(result?.statusName).toBe("DONE");
		expect(result?.mark).toBe("x");
	});
});

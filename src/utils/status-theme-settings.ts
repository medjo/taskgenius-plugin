import type {
	StatusCycle,
	TaskProgressBarSettings,
	TaskStatusConfig,
} from "@/common/setting-definition";
import { DEFAULT_SETTINGS } from "@/common/setting-definition";
import type { StatusCollection } from "@/common/task-status/StatusCollections";
import {
	anuppuccinSupportedStatuses,
	auraSupportedStatuses,
	borderSupportedStatuses,
	ebullientworksSupportedStatuses,
	itsSupportedStatuses,
	lytModeSupportedStatuses,
	minimalSupportedStatuses,
	thingsSupportedStatuses,
} from "@/common/task-status";

const STATUS_THEME_RESOLVERS: Record<string, () => StatusCollection> = {
	AnuPpuccin: anuppuccinSupportedStatuses,
	Aura: auraSupportedStatuses,
	Border: borderSupportedStatuses,
	Ebullientworks: ebullientworksSupportedStatuses,
	ITS: itsSupportedStatuses,
	LYTMode: lytModeSupportedStatuses,
	Minimal: minimalSupportedStatuses,
	Things: thingsSupportedStatuses,
};

function buildThemeCycle(statuses: StatusCollection) {
	const cycle: string[] = [];
	const marks: Record<string, string> = {};
	const excludeMarksFromCycle: string[] = [];
	const statusMap: Record<keyof TaskStatusConfig, string[]> = {
		completed: [],
		inProgress: [],
		abandoned: [],
		notStarted: [],
		planned: [],
	};

	for (const [symbol, name, type] of statuses) {
		const realName = name.split("/")[0].trim();
		if (!cycle.includes(realName)) {
			cycle.push(realName);
		}

		marks[realName] = symbol;

		if (symbol !== " " && symbol !== "x") {
			excludeMarksFromCycle.push(realName);
		}

		if (type in statusMap) {
			statusMap[type as keyof TaskStatusConfig].push(symbol);
		}
	}

	return {
		cycle,
		marks,
		excludeMarksFromCycle,
		statusMap,
	};
}

export function getStatusThemeStatuses(
	themeName: string,
): StatusCollection | null {
	const resolver = STATUS_THEME_RESOLVERS[themeName];
	return typeof resolver === "function" ? resolver() : null;
}

export function applyStatusThemeToSettings(
	settings: TaskProgressBarSettings,
	themeName: string,
): boolean {
	if (themeName === "Default") {
		settings.taskStatuses = {
			...DEFAULT_SETTINGS.taskStatuses,
		};
		settings.taskStatusCycle = [...DEFAULT_SETTINGS.taskStatusCycle];
		settings.taskStatusMarks = { ...DEFAULT_SETTINGS.taskStatusMarks };
		settings.excludeMarksFromCycle = [
			...DEFAULT_SETTINGS.excludeMarksFromCycle,
		];
		settings.statusCycles = (DEFAULT_SETTINGS.statusCycles || []).map((cycle) => ({
			...cycle,
			cycle: [...cycle.cycle],
			marks: { ...cycle.marks },
			excludeFromCycle: [...(cycle.excludeFromCycle || [])],
		}));
		return true;
	}

	const statuses = getStatusThemeStatuses(themeName);
	if (!statuses) {
		return false;
	}

	const { cycle, marks, excludeMarksFromCycle, statusMap } =
		buildThemeCycle(statuses);

	settings.taskStatusCycle = [...cycle];
	settings.taskStatusMarks = { ...marks };
	settings.excludeMarksFromCycle = [...excludeMarksFromCycle];

	for (const type of Object.keys(statusMap) as Array<keyof TaskStatusConfig>) {
		if (statusMap[type].length > 0) {
			settings.taskStatuses[type] = statusMap[type].join("|");
		}
	}

	settings.statusCycles = [
		{
			id: "default-cycle",
			name: themeName,
			description: `${themeName} theme workflow`,
			priority: 0,
			cycle: [...cycle],
			marks: { ...marks },
			excludeFromCycle: [],
			enabled: true,
		},
	];

	return true;
}

export function appendStatusThemeCycle(
	settings: TaskProgressBarSettings,
	themeName: string,
): StatusCycle | null {
	const statuses = getStatusThemeStatuses(themeName);
	if (!statuses) {
		return null;
	}

	const { cycle, marks, statusMap } = buildThemeCycle(statuses);

	const newStatusCycle: StatusCycle = {
		id: `cycle-${Date.now()}`,
		name: themeName,
		description: `${themeName} theme workflow`,
		priority: settings.statusCycles?.length || 0,
		cycle: [...cycle],
		marks: { ...marks },
		excludeFromCycle: [],
		enabled: true,
	};

	if (!settings.statusCycles) {
		settings.statusCycles = [];
	}
	settings.statusCycles.push(newStatusCycle);

	for (const type of Object.keys(statusMap) as Array<keyof TaskStatusConfig>) {
		if (statusMap[type].length > 0) {
			settings.taskStatuses[type] = statusMap[type].join("|");
		}
	}

	return newStatusCycle;
}

export function ensureDefaultStatusCycle(
	settings: TaskProgressBarSettings,
): StatusCycle {
	const existingCycle = settings.statusCycles?.[0];
	const fallbackCycle: StatusCycle = {
		id: existingCycle?.id || "default-cycle",
		name: "Default Cycle",
		description: "Migrated from legacy settings",
		priority: 0,
		cycle: [...settings.taskStatusCycle],
		marks: { ...settings.taskStatusMarks },
		excludeFromCycle: [...(settings.excludeMarksFromCycle || [])],
		enabled: existingCycle?.enabled ?? true,
		color: existingCycle?.color,
		icon: existingCycle?.icon,
	};

	settings.statusCycles = [fallbackCycle];

	return fallbackCycle;
}

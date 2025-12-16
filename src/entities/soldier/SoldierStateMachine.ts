import { setup } from "xstate";

export const soldierMachine = setup({
    types: {
        context: {} as { isDodging: boolean },
        events: {} as
            | { type: "ENEMY_SPOTTED" }
            | { type: "HUNT" }
            | { type: "RUN" }
            | { type: "DODGE_ON" }
            | { type: "DODGE_OFF" }
            | { type: "ENEMY_LOST" }
            | { type: "KILL" }
            | { type: "POINT_REACHED" },
    },
    actions: {
        startRetreating: () => {
            // console.log("startRetreating");
        },
        startPursuing: () => {
            // console.log("startPursuing");
        },
        interruptMovement: () => {
            // console.log("interruptMovement");
        },
        enableDodging: ({ context }) => {
            // console.log("enableDodging", context);
            context.isDodging = true;
        },
        disableDodging: ({context}) => {
            // console.log("disableDodging");
            context.isDodging = false;
        },
        startExploring: () => {
            // console.log("startExploring");
        },
    },
}).createMachine({
    context: {
        isDodging: true, // исправлено на false по умолчанию
    },
    id: "soldier",
    initial: "exploring", // упрощено, убрано состояние "alive"
    states: {
        exploring: {
            after: {
                100: {
                    target: "movement",
                },
            },
        },
        movement: {
            on: {
                ENEMY_SPOTTED: {
                    target: "combat",
                    actions: ["interruptMovement"], // массив строк
                },
                POINT_REACHED: {
                    target: "exploring",
                },
            },
        },
        combat: {
            initial: "attack",
            on: {
                ENEMY_LOST: {
                    target: "exploring",
                    actions: ["startExploring"], // массив строк
                },
                KILL: {
                    target: "dead",
                },
            },
            states: {
                attack: {
                    initial: "retreating",
                    on: {
                        DODGE_ON: {
                            actions: ["enableDodging"], // массив строк
                        },
                        DODGE_OFF: {
                            actions: ["disableDodging"], // массив строк
                        },
                    },
                    states: {
                        retreating: {
                            on: {
                                HUNT: {
                                    target: "pursuing",
                                },
                            },
                            entry: ["startRetreating"], // массив строк
                        },
                        pursuing: {
                            on: {
                                RUN: {
                                    target: "retreating",
                                },
                            },
                            entry: ["startPursuing"], // массив строк
                        },
                    },
                },
            },
        },
        dead: {
            type: "final",
        },
    },
});

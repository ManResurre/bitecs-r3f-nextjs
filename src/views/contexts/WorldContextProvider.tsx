import {PropsWithChildren} from "react";
import {LevelData} from "../../types/LevelData.tsx";
import {createLevel} from "../../logic/createLevel.ts";
import {pipe} from "bitecs";
import {timeSystem} from "../../logic/systems/timeSystem.ts";
import {useFrame} from "@react-three/fiber";
import {WorldContext} from "./WorldContext.tsx";
import {spawnEnemySystem} from "../../logic/systems/spawnEnemySystem.ts";
import {entitySystem} from "../../logic/systems/entitySystem.ts";

export function WorldContextProvider
({
     children,
     levelData,
 }: PropsWithChildren<{ levelData: LevelData }>) {

    const world = createLevel(levelData);

    const pipeline = pipe(
        timeSystem,
        spawnEnemySystem,
        entitySystem,
    );

    useFrame(() => {
        pipeline(world);
    });

    return (
        <WorldContext.Provider value={world}>{children}</WorldContext.Provider>
    );
}

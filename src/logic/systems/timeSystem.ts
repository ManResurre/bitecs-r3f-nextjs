import {defineSystem} from "bitecs";
import {World} from "../../entities/World.ts";

export const timeSystem = defineSystem((world: World) => {
    const {time} = world;
    const now = performance.now();
    const delta = (now - time.then) / 1000;
    time.delta = delta;
    time.elapsed += delta;
    time.then = now;
    return world;
});

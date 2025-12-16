import {createContext} from "react";
import {World} from "../../entities/World.ts";

export const WorldContext = createContext<World | undefined>(undefined);

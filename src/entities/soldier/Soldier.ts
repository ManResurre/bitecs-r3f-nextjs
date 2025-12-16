import {WithAnimation} from "./decorators/WithAnimation.ts";
import {WithVision} from "./decorators/WithVision.ts";
import {WithCombat} from "./decorators/WithCombat.ts";
import {WithMovement} from "./decorators/WithMovement.ts";
import {Npc} from "./Npc.ts";

@WithAnimation
@WithVision
@WithCombat
@WithMovement
export class Soldier extends Npc {
}

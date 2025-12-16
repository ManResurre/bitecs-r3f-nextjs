import {
    FollowPathBehavior, GameEntity, Goal, MemoryRecord, MemorySystem,
    NavMesh,
    OnPathBehavior,
    Polygon,
    Quaternion,
    Regulator, SeekBehavior,
    Think,
    Vector3,
    Vehicle, Vision
} from "yuka";
import CONFIG from "../core/Config.ts";
import {CustomWorld} from "../types";
import {ExploreEvaluator} from "../logic/evaluators/ExploreEvaluator.ts";
import {
    STATUS_ALIVE, STATUS_DEAD,
    STATUS_DYING,
} from "../core/Constants.ts";
import {AnimationAction, AnimationMixer, Group, Sprite, Vector3 as TreeVector3} from "three";
import {mobsQuery} from "../logic/queries";
import {TargetSystem} from "../core/TargetSystem.ts";
import {GetHealthEvaluator} from "../logic/evaluators/GetHealthEvaluator.ts";
import {RefObject} from "react";
import {AttackEvaluator} from "../logic/evaluators/AttackEvaluator.ts";
import {AssaultRifleComponent} from "../logic/components";
import {addComponent, addEntity} from "bitecs";
import {addBullet} from "../logic/systems/spawnBulletSystem.ts";
import {CharacterBounds} from "../logic/etc/CharacterBounds.ts";
import {CompositeGoal} from "yuka/src/goal/CompositeGoal";

// Константы для системы анимаций
const DIRECTIONS = [
    {direction: new Vector3(0, 0, 1), name: 'soldier_forward'},
    {direction: new Vector3(0, 0, -1), name: 'soldier_backward'},
    {direction: new Vector3(-1, 0, 0), name: 'soldier_left'},
    {direction: new Vector3(1, 0, 0), name: 'soldier_right'}
];

export class Mob extends Vehicle {
    public eid: number;
    public navMesh: NavMesh;
    public world: CustomWorld;
    private initialized = false;

    // Временные векторы для вычислений
    private tempForward = new Vector3(0, 0, 1);
    private tempUp = new Vector3(0, 1, 0);
    private tempVector = new Vector3();

    health = CONFIG.BOT.MAX_HEALTH;
    maxHealth = CONFIG.BOT.MAX_HEALTH;

    currentTime = 0;
    currentRegion: Polygon | null = null;
    currentPosition = new Vector3();
    previousPosition = new Vector3();

    // navigation path
    path: Vector3[] | null = null;

    brain = new Think(this);
    goalArbitrationRegulator = new Regulator(1);
    maxSpeed = CONFIG.BOT.MOVEMENT.MAX_SPEED;

    // animation
    mixer: AnimationMixer | null = null;
    status = STATUS_ALIVE;
    actions?: Record<string, AnimationAction>;
    actionsNames?: string[];

    // Система смешивания анимаций
    public lookDirection = new Vector3(0, 0, 1);
    public moveDirection = new Vector3(0, 0, 1);

    public quaternion = new Quaternion();
    private transformedDirection = new Vector3();
    private weightings: number[] = [0, 0, 0, 0];
    private positiveWeightings: number[] = [];
    private currentAnimationState = 'idle';

    // vision
    head: GameEntity;
    vision: Vision;
    visionRegulator = new Regulator(CONFIG.BOT.VISION.UPDATE_FREQUENCY);

    // memory
    memorySystem = new MemorySystem(this);
    memoryRecords: MemoryRecord[] = [];

    // death animation
    endTimeDying = Infinity;

    // searching for attackers
    searchAttacker = false;
    attackDirection = new Vector3();
    endTimeSearch = Infinity;

    // target system
    targetSystem = new TargetSystem(this);
    targetSystemRegulator = new Regulator(CONFIG.BOT.TARGET_SYSTEM.UPDATE_FREQUENCY);
    targetPosition = new Vector3();

    weaponContainer = new GameEntity();

    weaponRef?: RefObject<Group>;
    renderComponent?: RefObject<Group>;

    reactionTime = CONFIG.BOT.WEAPON.REACTION_TIME;

    arId: number;

    shotTimeInterval = 0.5;
    lastShootTime = 0;

    bounds = new CharacterBounds(this);

    constructor(eid: number, world: CustomWorld) {
        super();
        this.eid = eid;
        this.name = `mob_${eid}`;
        this.world = world;
        this.navMesh = world.navMesh!;

        this.arId = addEntity(world);
        addComponent(this.world, AssaultRifleComponent, this.arId);
        AssaultRifleComponent.shoot[this.arId] = 0;

        this.brain.addEvaluator(new AttackEvaluator());
        this.brain.addEvaluator(new ExploreEvaluator());
        this.brain.addEvaluator(new GetHealthEvaluator());

        // steering behaviors
        const followPathBehavior = new FollowPathBehavior();
        followPathBehavior.active = false;
        followPathBehavior.nextWaypointDistance = CONFIG.BOT.NAVIGATION.NEXT_WAYPOINT_DISTANCE;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        followPathBehavior._arrive.deceleration = CONFIG.BOT.NAVIGATION.ARRIVE_DECELERATION;
        this.steering.add(followPathBehavior);

        const onPathBehavior = new OnPathBehavior();
        onPathBehavior.active = false;
        onPathBehavior.path = followPathBehavior.path;
        onPathBehavior.radius = CONFIG.BOT.NAVIGATION.PATH_RADIUS;
        onPathBehavior.weight = CONFIG.BOT.NAVIGATION.ONPATH_WEIGHT;
        this.steering.add(onPathBehavior);

        const seekBehavior = new SeekBehavior();
        seekBehavior.active = false;
        this.steering.add(seekBehavior);

        this.memorySystem.memorySpan = CONFIG.BOT.MEMORY.SPAN;

        this.head = new GameEntity();

        this.vision = new Vision(this.head);
        this.vision.fieldOfView = 2 * Math.PI / 3; //120 градусов
        this.vision.range = 20;
    }

    start(): this {
        super.start();
        if (this.world.level) {
            this.vision.addObstacle(this.world.level);
        }
        return this;
    }

    setRenderComponentRef(renderComponentRef: RefObject<Group>) {
        if (!renderComponentRef.current || this.renderComponent)
            return;
        this.renderComponent = renderComponentRef;

        this.bounds.init(renderComponentRef.current)
    }

    setWeaponRef(weaponRef: RefObject<Group>) {
        this.weaponRef = weaponRef
    }

    public initializePosition(pos: Vector3): void {
        if (!this.navMesh) {
            console.warn(`Mob ${this.eid}: NavMesh not available for position initialization`);
            return;
        }

        // const region = this.navMesh.getRandomRegion();
        const region = this.navMesh.getRegionForPoint(pos, 4)

        if (region) {
            this.position.copy(region.centroid);
            this.currentRegion = region;
            this.previousPosition.copy(this.position);
            this.initialized = true;
        } else {
            this.position.copy(pos);
            console.error(`Mob ${this.eid}: Could not find random region for initialization`);
        }
    }

    stayInLevel() {
        if (!this.currentRegion) {
            this.currentRegion = this.navMesh.getRegionForPoint(this.position, 1);
            if (!this.currentRegion) {
                console.warn(`Mob ${this.eid}: No current region, skipping stayInLevel`);
                return this;
            }
        }

        this.currentPosition.copy(this.position);

        const newRegion = this.navMesh.clampMovement(
            this.currentRegion,
            this.previousPosition,
            this.currentPosition,
            this.position
        );

        if (newRegion) {
            this.currentRegion = newRegion;
        } else {
            console.warn(`Mob ${this.eid}: clampMovement returned null region`);
        }

        this.previousPosition.copy(this.position);

        if (this.currentRegion) {
            const distance = this.currentRegion.plane.distanceToPoint(this.position);
            this.position.y -= distance * CONFIG.NAVMESH.HEIGHT_CHANGE_FACTOR;
        }

        return this;
    }

    update(delta: number): this {
        super.update(delta);

        // Обновляем направление движения
        if (this.velocity.squaredLength() > 0.01) {
            this.moveDirection.copy(this.velocity).normalize();
        } else {
            this.moveDirection.set(0, 0, 0);
        }

        const MAX_GAME_TIME = 24 * 60 * 60;
        this.currentTime = (this.currentTime + delta) % MAX_GAME_TIME;

        if (!this.navMesh) {
            console.warn(`Mob ${this.eid}: No navMesh available`);
            return this;
        }

        if (!this.initialized) {
            this.currentRegion = this.navMesh.getRegionForPoint(this.position, 1);
            if (this.currentRegion) {
                this.initialized = true;
                console.log(`Mob ${this.eid}: Initialized in update`);
            }
        }

        this.stayInLevel();

        // update goals
        this.brain.execute();
        if (this.goalArbitrationRegulator.ready()) {
            this.brain.arbitrate();
        }

        this.updateAnimations();

        if (this.status === STATUS_ALIVE) {
            this.bounds.update();

            // update perception
            if (this.visionRegulator.ready()) {
                this.updateVision();
            }

            // update memory system
            this.memorySystem.getValidMemoryRecords(this.currentTime, this.memoryRecords);

            // update target system
            if (this.targetSystemRegulator.ready()) {
                this.targetSystem.update();
            }

            // stop search for attacker if necessary
            if (this.currentTime >= this.endTimeSearch) {
                this.resetSearch();
            }

            this.updateAimAndShot()
        }

        // handle dying
        if (this.status === STATUS_DYING) {
            if (this.currentTime >= this.endTimeDying) {
                this.status = STATUS_DEAD;
                this.endTimeDying = Infinity;
            }
        }

        this.head.position.copy(this.position).add(new Vector3(0, 1.5, 0));
        this.head.rotation.copy(this.quaternion);

        return this;
    }

    getStatus(): string[] {
        const getAllGoals = (rootGoal: CompositeGoal<Mob>): string[] => {
            const goals: string[] = [];
            const stack: Goal<Mob>[] = [rootGoal];

            while (stack.length > 0) {
                const currentGoal = stack.pop() as CompositeGoal<Mob>;
                goals.push(currentGoal.constructor.name);

                // Добавляем подцели в стек (в обратном порядке для сохранения порядка)
                if (currentGoal.subgoals && currentGoal.subgoals.length) {
                    for (let i = currentGoal.subgoals.length - 1; i >= 0; i--) {
                        stack.push(currentGoal.subgoals[i]);
                    }
                }
            }

            return goals;
        }

        return getAllGoals(this.brain);
    }

    removeEntityFromMemory(entity: GameEntity) {
        this.memorySystem.deleteRecord(entity);
        this.memorySystem.getValidMemoryRecords(this.currentTime, this.memoryRecords);
        return this;
    }

    updateVision() {
        if (this.world.level && !this.vision.obstacles.length) {
            this.vision.addObstacle(this.world.level);
        }

        const memorySystem = this.memorySystem;
        const vision = this.vision;

        const mobIds = mobsQuery(this.world);

        for (const mobId of mobIds) {
            if (this.eid == mobId) continue;

            const competitor = this.world.entityManager.getEntityByName(`mob_${mobId}`) as Mob;
            if (!competitor || competitor.status !== STATUS_ALIVE) continue;

            // Проверяем видимость
            const isVisible = vision.visible(competitor.head.position) && competitor.active;

            if (!memorySystem.hasRecord(competitor)) {
                memorySystem.createRecord(competitor);
            }

            const record = memorySystem.getRecord(competitor);
            if (!record) continue;

            if (isVisible) {
                record.visible = true;
                record.timeLastSensed = this.currentTime;
                record.lastSensedPosition.copy(competitor.position);
            } else {
                record.visible = false;
            }
        }

        return this;
    }

    atPosition(position: Vector3) {
        const tolerance = CONFIG.BOT.NAVIGATION.ARRIVE_TOLERANCE * CONFIG.BOT.NAVIGATION.ARRIVE_TOLERANCE;
        const distance = this.position.squaredDistanceTo(position);
        return distance <= tolerance;
    }

    setAnimations(mixer: AnimationMixer, actions: Record<string, AnimationAction>, names: string[]) {
        this.mixer = mixer;
        this.actions = actions;
        this.actionsNames = names;

        if (this.actions['soldier_idle']) {
            this.actions['soldier_idle'].play();
        }
    }


    private setIdleAnimation() {
        if (this.currentAnimationState === 'idle') return;

        for (const direction of DIRECTIONS) {
            const action = this.actions![direction.name];
            if (action) {
                action.enabled = false;
                action.weight = 0;
            }
        }

        const idleAction = this.actions!['soldier_idle'];
        if (idleAction) {
            idleAction.enabled = true;
            idleAction.weight = 1;
            if (!idleAction.isRunning()) {
                idleAction.play();
            }
        }

        this.currentAnimationState = 'idle';
    }

    updateAnimations() {
        if (!this.mixer || !this.actions) return this;

        if (this.status === STATUS_ALIVE) {
            const speed = this.getSpeed();

            if (speed < 0.1) {
                this.setIdleAnimation();
                return this;
            }

            this.quaternion.lookAt(
                this.tempForward,
                this.lookDirection,
                this.tempUp
            );

            this.calculateAnimationWeights(speed, this.lookDirection, this.moveDirection);
        }

        return this;
    }

    private calculateAnimationWeights(speed: number, testLookDirection?: Vector3, testMoveDirection?: Vector3) {
        if (!this.actions) {
            console.warn('Animation actions not available');
            return;
        }

        // Используем тестовые векторы если предоставлены, иначе реальные
        const lookDir = testLookDirection || this.lookDirection;
        const moveDir = testMoveDirection || this.moveDirection;

        // ВАЖНОЕ ИСПРАВЛЕНИЕ: Правильная логика из оригинального Enemy
        this.positiveWeightings.length = 0;
        let sum = 0;

        // Вычисляем кватернион для преобразования направлений
        // В оригинале это делается на основе разницы между forward и moveDirection
        const rotationQuaternion = new Quaternion();
        rotationQuaternion.lookAt(this.tempForward, moveDir, this.tempUp);

        for (let i = 0; i < DIRECTIONS.length; i++) {
            // Преобразуем локальное направление в мировое пространство
            this.transformedDirection.copy(DIRECTIONS[i].direction).applyRotation(rotationQuaternion);

            // Вычисляем скалярное произведение с направлением взгляда
            const dot = this.transformedDirection.dot(lookDir);
            this.weightings[i] = (dot < 0) ? 0 : dot;

            const actionName = DIRECTIONS[i].name;
            const action = this.actions[actionName];

            if (action && this.isActionValid(action)) {
                if (this.weightings[i] > 0.001) {
                    this.ensureActionReady(action);
                    action.enabled = true;
                    this.positiveWeightings.push(i);
                    sum += this.weightings[i];

                } else {
                    this.safelyDisableAction(action);
                }
            }
        }

        if (this.positiveWeightings.length === 0) {
            this.setIdleAnimation();
            return;
        }

        for (let i = 0; i < this.positiveWeightings.length; i++) {
            const index = this.positiveWeightings[i];
            const actionName = DIRECTIONS[index].name;
            const action = this.actions[actionName];

            if (action && this.isActionValid(action)) {
                this.ensureActionReady(action);
                action.weight = this.weightings[index] / sum;
                action.timeScale = Math.max(0.1, Math.min(2.0, speed / this.maxSpeed));

                if (!action.isRunning()) {
                    action.play();
                }
            }
        }

        const idleAction = this.actions['soldier_idle'];
        if (idleAction && this.isActionValid(idleAction)) {
            this.safelyDisableAction(idleAction);
        }

        this.currentAnimationState = 'moving';
    }

    private isActionValid(action: AnimationAction): boolean {
        return action !== null && action !== undefined &&
            typeof action.play === 'function' &&
            typeof action.stop === 'function';
    }

    private ensureActionReady(action: AnimationAction): void {
        try {
            if (!action.getMixer()) {
                console.warn('Animation action has no mixer');
                return;
            }
        } catch (error) {
            console.warn('Error checking animation action:', error);
        }
    }

    private safelyDisableAction(action: AnimationAction): void {
        try {
            if (this.isActionValid(action)) {
                action.enabled = false;
                action.weight = 0;
            }
        } catch (error) {
            console.warn('Error disabling animation action:', error);
        }
    }

    resetSearch() {
        this.searchAttacker = false;
        this.attackDirection.set(0, 0, 0);
        this.endTimeSearch = Infinity;
        return this;
    }

    rotateTo(target: Vector3, tolerance: number = 0.05): boolean {
        const currentY = this.position.y;
        const adjustedTarget = new Vector3(target.x, currentY, target.z);
        const direction = new Vector3().subVectors(adjustedTarget, this.position);

        if (direction.squaredLength() < 0.0001) {
            return true;
        }

        direction.normalize();

        // Обновляем направление взгляда
        this.lookDirection.copy(direction);

        this.quaternion.lookAt(
            this.tempForward,   // локальное направление "вперед" (0, 0, 1)
            this.lookDirection, // целевое направление в мировом пространстве
            this.tempUp         // локальное направление "вверх" (0, 1, 0)
        );

        // Правильное вычисление текущего направления вперед
        this.tempVector.copy(this.tempForward).applyRotation(this.quaternion);
        const dot = this.tempVector.dot(direction);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

        return angle <= tolerance;
    }

    updateAimAndShot() {
        AssaultRifleComponent.shoot[this.arId] = 0;

        const targetSystem = this.targetSystem;
        const target: Mob = targetSystem.getTarget() as Mob;

        if (target) {
            if (targetSystem.isTargetShootable()) {
                this.resetSearch();

                const targeted = this.rotateTo(target.position, 0.05);

                const timeBecameVisible = targetSystem.getTimeBecameVisible();
                const elapsedTime = this.currentTime;

                if (targeted && (elapsedTime - timeBecameVisible) >= this.reactionTime) {
                    // Начало стрельбы

                    if (this.lastShootTime + this.shotTimeInterval < this.currentTime) {
                        const mf = this.weaponRef?.current.getObjectByName("MuzzleFlash") as Sprite;

                        if (mf) {
                            AssaultRifleComponent.shoot[this.arId] = 1;
                            const pos = mf.getWorldPosition(new TreeVector3())

                            const targetPos = target.position.clone();
                            target.bounds.getCenter(targetPos);
                            addBullet(this.arId, pos, targetPos, this.world)
                        }

                        this.lastShootTime = this.currentTime;
                    }
                }
            } else {
                if (this.searchAttacker) {
                    this.targetPosition.copy(this.position).add(this.attackDirection);
                    this.rotateTo(this.targetPosition);
                } else {
                    this.rotateTo(targetSystem.getLastSensedPosition() as Vector3);
                }
            }
        } else {
            if (this.searchAttacker) {
                this.targetPosition.copy(this.position).add(this.attackDirection);
                this.rotateTo(this.targetPosition);
            } else {
                // Улучшенная логика для направления взгляда
                if (this.moveDirection.squaredLength() > 0.01) {
                    this.tempVector.copy(this.moveDirection);
                    this.rotateTo(this.position.clone().add(this.tempVector), 0.1);
                }
            }
        }
        return this;
    }
}

export class Regulator {
    private readonly frameInterval: number;
    private frameCount: number;

    constructor(updatesPerSecond: number = 0) {
        this.frameInterval = updatesPerSecond <= 0 ? 0 : Math.max(1, Math.round(60 / updatesPerSecond));
        this.frameCount = 0;
    }

    ready(): boolean {
        // Всегда готов если отключен
        if (this.frameInterval === 0) {
            return true;
        }

        this.frameCount++;

        if (this.frameCount >= this.frameInterval) {
            this.frameCount = 0;
            return true;
        }

        return false;
    }

    reset() {
        this.frameCount = 0;
    }
}

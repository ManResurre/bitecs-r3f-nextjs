// OcclusionController.jsx
import { useControls } from 'leva';

const OcclusionController = () => {
    const { enabled, fadeOpacity, sphereSize } = useControls('Occlusion', {
        enabled: { value: true },
        fadeOpacity: { value: 0.3, min: 0.1, max: 0.8, step: 0.1 },
        sphereSize: { value: 0.8, min: 0.3, max: 2, step: 0.1 }
    });

    return null;
};

export default OcclusionController;

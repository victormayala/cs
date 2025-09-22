import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { Layer as KonvaLayer } from 'konva/lib/Layer';
import type { Node as KonvaNode } from 'konva/lib/Node';

type StageState = {
    scale: { x: number; y: number };
    position: { x: number; y: number };
    rotation: number;
    layers: Array<{
        id: string;
        visible: boolean;
        opacity: number;
        nodes: Array<{
            id: string;
            visible: boolean;
            opacity: number;
            scale: { x: number; y: number };
            rotation: number;
            position: { x: number; y: number };
        }>;
    }>;
};

export const getStageState = (stage: KonvaStage): StageState => ({
    scale: stage.scale(),
    position: stage.position(),
    rotation: stage.rotation(),
    layers: stage.getLayers().map(layer => ({
        id: layer.id(),
        visible: layer.isVisible(),
        opacity: layer.opacity(),
        nodes: (layer.children?.map(node => ({
            id: node.id(),
            visible: node.isVisible(),
            opacity: node.opacity(),
            scale: node.scale(),
            rotation: node.rotation(),
            position: node.position()
        })) || [])
    }))
});

export const applyStageState = (stage: KonvaStage, state: StageState) => {
    stage.scale(state.scale);
    stage.position(state.position);
    stage.rotation(state.rotation);

    state.layers.forEach(layerState => {
        const layer = stage.findOne(`#${layerState.id}`) as KonvaLayer;
        if (layer) {
            layerState.visible ? layer.show() : layer.hide();
            layer.opacity(layerState.opacity);

            layerState.nodes.forEach(nodeState => {
                const node = layer.findOne(`#${nodeState.id}`);
                if (node) {
                    nodeState.visible ? node.show() : node.hide();
                    node.opacity(nodeState.opacity);
                    node.scale(nodeState.scale);
                    node.rotation(nodeState.rotation);
                    node.position(nodeState.position);
                }
            });
        }
    });

    stage.batchDraw();
};
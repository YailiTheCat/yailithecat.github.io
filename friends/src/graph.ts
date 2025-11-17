import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { hslToRgb } from './helpers';
import Sigma from 'sigma';
import { Data } from './types';

export function createGraph(data: Data) {
    const graph = new Graph();
    graph.addNode('me', { label: 'Me', x: 0, y: 0, size: 10, color: 'green' });

    data.friends.forEach(f => {
        graph.addNode(f.id, { label: f.displayName, x: Math.random(), y: Math.random(), size: 5 });
        graph.addEdge('me', f.id, { color: 'blue' });
    });

    Object.keys(data.mutuals ?? {}).forEach(id1 => {
        data.mutuals[id1].forEach(id2 => {
            if (graph.hasNode(id1) && graph.hasNode(id2) && !graph.hasEdge(id1, id2) && id1 !== id2) {
                graph.addEdge(id1, id2, { color: `rgba(0,0,255,0.2)` });
            }
        });
    });

    louvain.assign(graph, { getEdgeWeight: null });

    forceAtlas2.assign(graph, {
        iterations: 50,
        settings: {
            gravity: 10,
        },
    });

    graph.nodes().forEach(node => {
        const community = graph.getNodeAttribute(node, 'community');
        const c = hslToRgb(((community * 137.508) % 360) / 360, 1, 0.5);
        graph.setNodeAttribute(node, 'color', `rgb(${c[0]}, ${c[1]}, ${c[2]})`);

        if (graph.neighbors(node).length < 2) {
            graph.setNodeAttribute(node, 'color', 'rgb(150, 150, 150)');
        }

        graph.setNodeAttribute(node, 'size', graph.neighbors(node).length / 10 + 5);

        if (node === 'me') {
            graph.setNodeAttribute(node, 'color', 'green');
        }
    });

    const renderer = new Sigma(graph, document.getElementById('container')!, {
        labelColor: { color: 'rgb(200, 200, 200)' },
    });
}

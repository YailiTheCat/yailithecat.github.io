import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { hslToRgb } from './helpers';
import Sigma from 'sigma';
import { Data } from './types';

export function createGraph(data: Data) {
    let loadedImgs = 0;
    let created = false;

    const imgLoaded = () => {
        loadedImgs++;
        if (loadedImgs >= data.friends.length - 2 && !created) {
            createRenderer();
            created = true;
        }
    };

    const createRenderer = () => {
        const sigma = new Sigma(graph, document.getElementById('container')!, {
            labelColor: { color: 'rgb(200, 200, 200)' },
        });

        let hoveredNode: null | string = null;

        sigma.addListener('enterNode', e => {
            hoveredNode = e.node;
        });

        sigma.addListener('leaveNode', e => {
            hoveredNode = null;
        });

        sigma.addListener('afterRender', () => {
            sigma.setSetting('nodeReducer', (node, data) => {
                if (node != 'me') {
                    const element = document.getElementById(`img-${node}`);
                    const position = sigma.graphToViewport({ x: data.x, y: data.y });
                    const size = sigma.scaleSize(data.size * 1.7, sigma.getCamera().ratio);
                    element!.style.left = `${position.x - size / 2}px`;
                    element!.style.top = `${position.y - size / 2}px`;
                    element!.setAttribute('width', `${size}`);
                }

                if (hoveredNode) {
                    return node === hoveredNode || graph.hasEdge(node, hoveredNode) || graph.hasEdge(hoveredNode, node)
                        ? { ...data, zIndex: 1, forceLabel: true }
                        : {
                            ...data,
                            zIndex: 0,
                            label: '',
                            color: 'rgb(80,80,80)',
                            image: null,
                            highlighted: false,
                        };
                }

                return data;
            });

            sigma.setSetting(
                'edgeReducer',
                hoveredNode
                    ? (edge, data) =>
                          graph.hasExtremity(edge, hoveredNode)
                              ? { ...data, color: 'rgb(255,0,0)' }
                              : { ...data, color: 'rgb(0,0,90)' }
                    : null,
            );
        });
    };

    document.getElementById('img-tmp')!.innerHTML = '';

    const graph = new Graph();
    graph.addNode('me', { label: 'Me', x: 0, y: 0, size: 5, color: 'green' });

    data.friends.forEach(f => {
        document.getElementById('img-tmp')!.innerHTML +=
            `<img style="background: black; object-fit: fill; aspect-ratio: 1/1; border-radius: 50%; display: block; position: absolute; left: -1000px" width="50" id="img-${f.id}" src="${f.imageUrl}" />`;
        imgLoaded();
        graph.addNode(f.id, { label: f.displayName, x: Math.random(), y: Math.random(), size: 5, image: f.imageUrl });
        graph.addEdge('me', f.id, { color: 'rgb(0,0,120)' });
    });

    Object.keys(data.mutuals ?? {}).forEach(id1 => {
        data.mutuals[id1].forEach(id2 => {
            if (graph.hasNode(id1) && graph.hasNode(id2) && !graph.hasEdge(id1, id2) && id1 !== id2) {
                graph.addEdge(id1, id2, { color: `rgb(0,0,120)` });
            }
        });
    });

    const maxNeighbors = Math.max(...graph.nodes().map(node => (node === 'me' ? 0 : graph.neighbors(node).length)));

    graph.nodes().forEach(node => {
        graph.setNodeAttribute(node, 'size', 5 + 10 * (graph.neighbors(node).length / maxNeighbors));

        if (node === 'me') {
            graph.setNodeAttribute(node, 'size', 15);
        }
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

        if (node === 'me') {
            graph.setNodeAttribute(node, 'color', 'green');
        }
    });
}

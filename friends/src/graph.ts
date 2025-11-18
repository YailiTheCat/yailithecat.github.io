import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { hslToRgb } from './helpers';
import Sigma from 'sigma';
import { Data, Friend } from './types';

export function createGraph(data: Data) {
    const openSidePanel = (friend: Friend) => {
        const sidepanel = document.getElementById('sidepanel')!;
        (document.getElementById('sidepanel-profile-pic') as HTMLImageElement).src = friend.imageUrl;
        (document.getElementById('sidepanel-name') as HTMLDivElement).innerText = friend.displayName;
        (document.getElementById('sidepanel-id') as HTMLDivElement).innerText = friend.id;
        (document.getElementById('sidepanel-bio') as HTMLDivElement).innerText = friend.bio;
        (document.getElementById('sidepanel-mutual-list') as HTMLDivElement).innerHTML =
            data.mutuals[friend.id]
                ?.map(item => `<li>${nodeToName[item]}</li>`)
                .sort((a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : -1)
                .join('') ?? '';
        (document.getElementById('sidepanel-friend-count') as HTMLDivElement).innerText =
            `Mutual friends: ${data.mutuals[friend.id]?.length ?? 0}`;
        (document.getElementById('sidepanel-status') as HTMLDivElement).innerText = friend.statusDescription;
        (document.getElementById('sidepanel-avatar-pic') as HTMLImageElement).src = friend.currentAvatarImageUrl;
        sidepanel.classList.remove('closed');
    };

    let loadedImgs = 0;
    let created = false;
    const nodeToName: Record<string, string> = {};
    const nodeToIndex: Record<string, number> = {};
    const friendsProgressRange = document.getElementById('friends-progress') as HTMLInputElement;

    friendsProgressRange.max = `${data.friends.length}`;
    friendsProgressRange.min = `0`;
    friendsProgressRange.value = friendsProgressRange.max;

    let lastFrameTime = +new Date();

    const imgLoaded = () => {
        loadedImgs++;
        if (loadedImgs >= data.friends.length - 2 && !created) {
            createRenderer();
            created = true;
        }
    };

    for (let i = 0; i < data.currentUser.friends.length; i++) {
        nodeToIndex[data.currentUser.friends[i]] = i;
    }

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

        sigma.addListener('clickNode', e => {
            const nodeId = e.node;
            if (nodeId === 'me') {
                return;
            }
            const friend = data.friends.find(f => f.id === nodeId);
            if (!friend) {
                return;
            }

            openSidePanel(friend);
        });

        sigma.addListener('afterRender', () => {
            const playing = !!(window as any).playing;

            if (playing) {
                const now = +new Date();
                const delta = now - lastFrameTime;
                if (delta > 300) {
                    lastFrameTime = now;
                    const newVal = parseInt(friendsProgressRange.value, 10) + 1;
                    friendsProgressRange.value = `${newVal > parseInt(friendsProgressRange.max, 10) ? 0 : newVal}`;
                }
            }

            const visibleSlider = parseInt(friendsProgressRange.value, 10);

            const searchValue = ((document.getElementById('search') as HTMLInputElement).value ?? '')
                .trim()
                .toLowerCase();

            sigma.setSetting('nodeReducer', (node, data) => {
                if (node != 'me') {
                    const element = document.getElementById(`img-${node}`);
                    const position = sigma.graphToViewport({ x: data.x, y: data.y });
                    const size = sigma.scaleSize(data.size * 1.7, sigma.getCamera().ratio);
                    element!.style.left = `${position.x - size / 2}px`;
                    element!.style.top = `${position.y - size / 2}px`;
                    element!.setAttribute('width', `${size}`);

                    const index = (nodeToIndex[node] ?? 0) + 1;
                    if (index > visibleSlider) {
                        element!.style.opacity = `0`;
                        return { ...data, hidden: true };
                    }

                    if (!!searchValue) {
                        element!.style.opacity = (nodeToName[node] ?? '').toLowerCase().includes(searchValue)
                            ? `1`
                            : `0`;
                    } else if (!!hoveredNode) {
                        element!.style.opacity =
                            node === hoveredNode || graph.hasEdge(node, hoveredNode) || graph.hasEdge(hoveredNode, node)
                                ? `1`
                                : `0.2`;
                    } else {
                        element!.style.opacity = `1`;
                    }
                }

                if (!!searchValue) {
                    return (nodeToName[node] ?? '').toLowerCase().includes(searchValue)
                        ? { ...data, zIndex: 1, forceLabel: true }
                        : {
                              ...data,
                              zIndex: 0,
                              label: '',
                              color: 'rgb(20,20,20)',
                              image: null,
                              highlighted: false,
                          };
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

                const recentlyPlayed = (nodeToIndex[node] ?? 0) > visibleSlider - (2 + 3);
                const lastPlayed = (nodeToIndex[node] ?? 0) > visibleSlider - 2;

                return playing
                    ? {
                          ...data,
                          label: recentlyPlayed ? data.label : '',
                          forceLabel: recentlyPlayed,
                          color: lastPlayed ? 'white' : data.color,
                      }
                    : data;
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
        nodeToName[f.id] = f.displayName;
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

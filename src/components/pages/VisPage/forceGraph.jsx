import ForceGraph3D from '3d-force-graph'
import { Flex } from '@chakra-ui/react'
import makeBlockie from 'ethereum-blockies-base64'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import { getImageFromIPFSHash } from '../../../utils/web3/ipfs'
import minionImg from './assets/minion.png'
// migrate to Ts
// test aura color f(chain)
// test size f(members | treasure)

const ForceGraph = ({ nodes, links, sharePower, lowLimitTimestamp }) => {
  // const [selectedNode, setSelectedNode] = useState()

  function focusNode(graph, node) {
    const distance = 150
    if (node.x && node.y && node.z) {
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z)
      graph.cameraPosition(
        {
          x: node.x * distRatio,
          y: node.y * distRatio,
          z: node.z * distRatio,
        },
        node,
        3000
      )
      // setSelectedNode(node)
    }
  }

  /* eslint-disable global-require */
  async function create3dGraph() {
    const spaceHolder = document.getElementById('3d-graph')
    if (nodes.length > 0) {
      const gData = { nodes, links }
      //handle selections and effects on particular nodes
      const highlightNodes = new Set()
      const highlightLinks = new Set()
      let hoverNode: string | null = null
      /* eslint-disable-next-line no-inner-declarations */
      function updateHighlight() {
        graph.linkWidth(graph.linkWidth())
        // .linkDirectionalParticles(graph.linkDirectionalParticles())
      }

      const graph = ForceGraph3D()(spaceHolder)
        .backgroundColor('#0E1235')
        .nodeLabel('label')
        // .nodeAutoColorBy('group')
        .nodeThreeObject((node: Node) => {
          let imageUrl
          if (node && node.image) {
            imageUrl = getImageFromIPFSHash(node.image)
          } else if (node && node.isSafeMinion) {
            imageUrl = minionImg
          } else {
            imageUrl = makeBlockie(node.id)
          }
          const imgTexture = new THREE.TextureLoader().load(imageUrl)
          const material = new THREE.SpriteMaterial({
            map: imgTexture,
            color: 0xffffff,
            transparent: true,
            opacity: node.hidden ? 0.05 : 0.8,
          })
          const sprite = new THREE.Sprite(material)
          if (node.group === 0 || node.isSafeMinion) {
            sprite.scale.set(100, 100, 1)
          } else {
            sprite.scale.set(20, 20, 1)
          }
          return sprite
        })
        .onNodeClick((node) => {
          focusNode(graph, node)
        })
        .onNodeRightClick((node) => {
          navigator.clipboard.writeText(node.id)
          alert('Copied the text: ' + node.id)
        })
        .onNodeHover((node) => {
          if ((!node && !highlightNodes.size) || (node && hoverNode === node))
            return
          highlightNodes.clear()
          highlightLinks.clear()
          const newNodesMarked: Array<any> = []
          gData.links.reduce((neighborsLinks, link: any) => {
            if (node.id === link.target.id || node.id === link.source.id) {
              newNodesMarked.push(link)
            }
            return newNodesMarked
          }, {})
          newNodesMarked.forEach((link) => highlightLinks.add(link))
          hoverNode = node || null
          updateHighlight()
        })
        // .linkDirectionalParticles((link) => (highlightLinks.has(link) ? 3 : 0))
        // .linkDirectionalParticleWidth(3)
        .linkWidth((link) => (highlightLinks.has(link) ? 5 : 0.8)) // if target.hidden = 0
        .linkColor((link) => (highlightLinks.has(link) ? 'green' : 'gray'))
        .graphData(gData)

      // .d3Force("link", d3.forceLink().strength(d => parseInt(d.shares)))

      if (sharePower) {
        graph.d3Force('link').distance((link) => {
          if (link.shares > 0.005) {
            return 10 / link.shares
          } else {
            return 200
          }
        })
      } else {
        graph.d3Force('link').distance(100)
      }

      graph.onBackgroundClick(zoomOut)
      const bloomPass = new UnrealBloomPass()
      bloomPass.strength = 0.5
      bloomPass.radius = 1
      bloomPass.threshold = 0.3
      graph.postProcessingComposer().addPass(bloomPass)
      return graph
    }
  }

  function zoomOut() {
    graph.current.zoomToFit(100)
  }
  /*
  function onWindowResize() {
   camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    graph.setSize( window.innerWidth, window.innerHeight );
    render();
  }
  */

  const graph = useRef(null)

  useEffect(async () => {
    if (nodes && links && !graph.current) {
      console.log(`create`)
      graph.current = await create3dGraph()
    } else if (nodes && links && graph.current) {
      console.log(`update`)
      graph.current.graphData({ nodes, links })
    }
  }, [nodes, links])

  /*   // how can i rerender without recreating all data?
  useEffect(() => {
    if(graph && graph.current){
      console.log(`Called`)
      const {nodes, links} = graph.current.graphData()
      // lets try to filter in here!
      if (nodes && links) {
        const newNodes = nodes.map(x => {
          const temp = Object.assign({}, x)
          if (temp.createdAt > lowLimitTimestamp) {
            temp.hidden = true
          }
          return temp
        })
        const newNodesAddresses = newNodes.map(x => {
          if(!x.hidden) return x.id
        })
        const newLinks = links.filter(x => newNodesAddresses.includes(x.target.id))
        if(newNodes && newLinks) {
          const hide = newNodes.filter(x => x.hidden)
          console.log(`${hide.length} nodes where hidden`)
          console.log(nodes)
          console.log(newNodes)
          graph.current.graphData({newNodes, links})
        }

      }
  
    }
  },[sharePower, lowLimitTimestamp])   
*/
  /*   window.addEventListener( 'resize', onWindowResize, false ); */

  return (
    <>
      <Flex id="3d-graph" style={{ width: '50%', height: '30%' }} />
    </>
  )
}

export default ForceGraph

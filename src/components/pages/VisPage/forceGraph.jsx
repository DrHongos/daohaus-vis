import ForceGraph3D from '3d-force-graph'
import { Flex } from '@chakra-ui/react'
import makeBlockie from 'ethereum-blockies-base64'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import { getImageFromIPFSHash } from '../../../utils/web3/ipfs'

// migrate to Ts
// test aura color f(chain)
// test size f(members | treasure)

const ForceGraph = ({ nodes, links }) => {
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
        graph
          .linkWidth(graph.linkWidth())
          .linkDirectionalParticles(graph.linkDirectionalParticles())
      }

      const graph = ForceGraph3D()(spaceHolder)
        .backgroundColor('#0E1235')
        .nodeLabel('label')
        // .nodeAutoColorBy('group')
        .nodeThreeObject((node: Node) => {
          let imageUrl
          if (node && node.image) {
            imageUrl = getImageFromIPFSHash(node.image)
          } else {
            imageUrl = makeBlockie(node.id)
          }
          const imgTexture = new THREE.TextureLoader().load(imageUrl)
          const material = new THREE.SpriteMaterial({
            map: imgTexture,
            color: 0xffffff,
          })
          const sprite = new THREE.Sprite(material)
          if (node.group === 0) {
            sprite.scale.set(60, 60, 1)
          } else {
            sprite.scale.set(8, 8, 1)
          }

          return sprite
        })
        .onNodeClick((node) => {
          focusNode(graph, node)
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
        .linkDirectionalParticles((link) => (highlightLinks.has(link) ? 3 : 0))
        .linkDirectionalParticleWidth(3)
        .linkWidth((link) => (highlightLinks.has(link) ? 0.5 : 0.8))
        .graphData(gData)

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

  const graph = useRef(null)
  useEffect(async () => {
    if (nodes && links) {
      graph.current = await create3dGraph()
    }
  }, [nodes, links])

  return (
    <>
      <Flex id="3d-graph" style={{ width: '50%', height: '30%' }} />
    </>
  )
}

export default ForceGraph

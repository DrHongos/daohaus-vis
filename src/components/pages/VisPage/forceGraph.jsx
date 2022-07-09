import ForceGraph3D from '3d-force-graph'
import { Flex } from '@chakra-ui/react'
/* import { timeStamp } from 'console' */
import { GUI } from 'dat.gui'
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
            opacity: node.createdAt > lowLimitTimestamp ? 0.05 : 0.8,
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
          console.log(JSON.stringify(node))
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

      window.addEventListener('resize', onWindowResize, false)
      function onWindowResize() {
          console.log("resizing")
/*           graph.camera.aspect = window.innerWidth / window.innerHeight
          graph.camera.updateProjectionMatrix()
          renderer.setSize(window.innerWidth, window.innerHeight)
          render() 
          */
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
  //Define GUI
  const Settings = function() {
    this.redDistance = 20
    this.greenDistance = 20
  }

  const settings = new Settings()
  // its creating it multiple times
  let gui;
  if (!gui) {
    gui = new GUI({name: 'first GUI'})
    gui.autoplace = false
    gui.style = {
      position: 'absolute',
      top: '50px',
      left: '20px'
    }
    const controllerOne = gui.add(settings, 'redDistance', 0, 100)
    const controllerTwo = gui.add(settings, 'greenDistance', 0, 100)
    controllerOne.onChange(updateLinkDistance)
    controllerTwo.onChange(updateLinkDistance)  
    
  }
  

  function zoomOut() {
    graph.current.zoomToFit(100)
  }

  const graph = useRef(null)

  useEffect(async () => {
    if (nodes && links && !graph.current) {
      console.log(`create`)
      graph.current = await create3dGraph()
    } else if (nodes && links && graph.current) {
      console.log(`update`)
      // changing the timestamp in parent will update nodes & links so.. im cancelling it
      graph.current.graphData({ nodes, links })
    }
  }, [nodes, links])

  // change this to createdAt in limits of controls
  function updateLinkDistance() {
    /*     graph.d3Force('link').distance(link => link.color ? settings.redDistance : settings.greenDistance); */
        console.log(`graph ${JSON.stringify(graph)}`)
        if (graph.current) {
          graph.current.numDimensions(3); // Re-heat simulation
        }
      }
   

  /*     // how can i rerender without recreating all data?
  useEffect(() => {
    if(graph && graph.current){
      console.log(`Called`)
      const {nodes, links} = graph.current.graphData()
      // lets try to filter in here!      
      if (nodes && links) {
        let nodesHidden = []; // fill up to make changes in links
        const newNodes = nodes.map(x => {
          const temp = Object.assign({}, x)
          if (temp.createdAt > lowLimitTimestamp) {
            temp.__threeObj.visible = false
            nodesHidden.push(x.id)
          }
          return temp
        })
        const newLinks = links.map(x => {
          const temp = Object.assign({}, x)
          if (nodesHidden.includes(x.target.id)) {
            temp.value = 0
          }
          return temp
        })
        if(newNodes.length && newLinks.length) {
          graph.current.graphData({newNodes, newLinks})
        }
      }  
    }
  },[lowLimitTimestamp]) */   

  /*   window.addEventListener( 'resize', onWindowResize, false ); */

  return (
    <>
      <Flex id="3d-graph" style={{ 
        marginTop: '80px',
        width: '50%', 
        height: '30%' 
        }} />
    </>
  )
}

export default ForceGraph

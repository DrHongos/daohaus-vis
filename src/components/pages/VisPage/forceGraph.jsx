import ForceGraph3D from '3d-force-graph'
import { GUI } from 'dat.gui'
import makeBlockie from 'ethereum-blockies-base64'
import React from 'react'
import * as THREE from 'three'
/* import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js' */

import { getImageFromIPFSHash } from '../../../utils/web3/ipfs'
import minionImg from './assets/minion.png'

// TODO

const ForceGraph = ({ nodes, links, minMax }) => {
  function init() {
    const list = document.getElementsByClassName('dg main a')
    while (list[0]) {
      list[0].parentNode.removeChild(list[0])
    }

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
      }
    }

    function zoomOut(graph) {
      graph.zoomToFit(100)
    }
    function setSharesPower(graph, settings) {
      if (settings.sharePower) {
        // .d3Force("link", d3.forceLink().strength(d => parseInt(d.shares)))
        graph.d3Force('link').distance((link) => {
          if (link.shares > 0.005) {
            return 10 / link.shares
          } else {
            return 200
          }
        })
      } else {
        graph.d3Force('link').distance(() => {
          return 100
        })
      }
    }
    const nodePreparation = (node) => {
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
        opacity: node.createdAt > settings.timeLimit ? 0.05 : 0.8,
      })
      const sprite = new THREE.Sprite(material)
      if (node.group === 0 || node.isSafeMinion) {
        sprite.scale.set(100, 100, 1)
      } else {
        sprite.scale.set(20, 20, 1)
      }
      return sprite
    }
    function updateHighlight() {
      graph.linkWidth(graph.linkWidth())
    }
    const getDate = (timestamp) =>
      new Date(timestamp * 1000).toLocaleDateString()
    /* eslint-disable-next-line no-inner-declarations */

    function deleteNodeOptions() {
      const folder = gui.__folders['Node']
      if (!folder) {
        return
      }
      folder.close()
      gui.__ul.removeChild(folder.domElement.parentNode)
      delete gui.__folders['Node']
      gui.onResize()
    }

    function createNodeFolder() {
      let nodeOptions
      try {
        nodeOptions = gui.addFolder('Node')
      } catch {
        deleteNodeOptions()
        nodeOptions = gui.addFolder('Node')
      }
      nodeOptions.add(settings.nodeSelected, 'id')
      const nodeData = {
        created: getDate(settings.nodeSelected.createdAt),
      }
      nodeOptions.add(nodeData, 'created')      
      const explorers = {
        mainnet: function () {
          openExplorer(
            `https://etherscan.io/address/${settings.nodeSelected.id}`
          )
        },
        gnosis: function () {
          openExplorer(
            `https://blockscout.com/xdai/mainnet/address/${settings.nodeSelected.id}`
          )
        },
        daohaus: function () {
          openExplorer(
            //TODO: fix the chain in the url
            `https://app.daohaus.club/dao/0x64/${settings.nodeSelected.id}`
          )
        },
        // continue with others
      }
      nodeOptions.add(explorers, 'mainnet').name('Mainnet explorer')
      nodeOptions.add(explorers, 'gnosis').name('Gnosis explorer')
      if(settings.nodeSelected.group === 0) {
        // maybe create a DAO folder to include the specific functions
        nodeOptions.add(explorers, 'daohaus').name('DaoHaus link')
      }
    }
    const functions = {
      animate: function() {
        const totalTime = 60 // 1 min
        const interval = (minMax[1] - settings.timeLimit) / totalTime
        // check interval is valid or we're fucked in a loop
        const intervalId = setInterval(() => {
          settings.timeLimit = settings.timeLimit + interval
          settings.date = getDate(settings.timeLimit)
          // how do i recreate without going trough all nodes?
          gui.updateDisplay()
          graph.nodeThreeObject((node: Node) => {
            return nodePreparation(node)
          })
          if(settings.timeLimit >= minMax[1]) {
            clearInterval(intervalId)
          }
        }, 1000)
      }
    }
    /* eslint-disable global-require */
    const spaceHolder = document.getElementById('3d-graph')
    const gData = { nodes, links }
    //handle selections and effects on particular nodes
    const highlightNodes = new Set()
    const highlightLinks = new Set()
    let hoverNode: string | null = null

    const Settings = function () {
      this.timeLimit = minMax[1]
      this.sharePower = false
      this.date = getDate(minMax[1])
      this.nodeSelected = null
    }
    const settings = new Settings()
    const gui = new GUI({
      name: 'first GUI',
      autoplace: false,
      useLocalStorage: true,
      width: 500,
    })
    const properties = gui.addFolder('Properties')
    const controllerOne = properties.add(
      settings,
      'timeLimit',
      minMax[0],
      minMax[1],
      24*60*60
    )
    properties.add(functions, 'animate').name('Animate timeline')
    const sharePowerCheckbox = properties.add(settings, 'sharePower')
    properties.add(settings, 'date')
    controllerOne.onFinishChange((e) => {
      settings.date = getDate(e)
      gui.updateDisplay()
      graph.nodeThreeObject((node: Node) => {
        return nodePreparation(node)
      })
    })
    sharePowerCheckbox.onChange(() => {
      setSharesPower(graph, settings)
    })
    const openExplorer = (url) => window.open(url, '_blank').focus()
    const graph = ForceGraph3D()(spaceHolder)
      .backgroundColor('#0E1235')
      .nodeLabel('label')
      .nodeThreeObject((node: Node) => {
        return nodePreparation(node)
      })
      .onNodeClick((node) => {
        settings.nodeSelected = node
        focusNode(graph, node)
        createNodeFolder()
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
      .linkWidth((link) => (highlightLinks.has(link) ? 5 : 0.8)) // if target.hidden = 0
      .linkColor((link) => (highlightLinks.has(link) ? 'green' : 'gray'))
      .onBackgroundClick(() => {
        zoomOut(graph)
        settings.nodeSelected = null
        deleteNodeOptions()
      })
      .graphData(gData)

    setSharesPower(graph, settings)

    /*    Fix this.. search for the correct method   
      window.addEventListener('resize', onWindowResize, false) */

    /* const bloomPass = new UnrealBloomPass()
    bloomPass.strength = 0.2
    bloomPass.radius = 1
    bloomPass.threshold = 0.3
    graph.postProcessingComposer().addPass(bloomPass) */
   
  }
  init()
  return <></>
}

export default React.memo(ForceGraph)

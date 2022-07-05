import { Button } from '@chakra-ui/button'
import { Stack } from '@chakra-ui/layout'
import {
  Select,
  Center,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Checkbox,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
  Slider,
  SliderTrack,
  SliderThumb,
  SliderFilledTrack,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'

import ForceGraph from './forceGraph'
import { getGraphProps } from './getGraphProps'

import { LoadingLogo } from '@/components'
// import { Error } from '@/components/Error'
import { DaoMetadata } from '@/hooks/useDaoMetadata/types'
import { Moloch } from '@/types/DAO'

type daoObject = {
  daoMetadata?: DaoMetadata[]
  moloch?: Moloch[]
  hidden: boolean
}

export const VisPage = (): JSX.Element => {
  // filter members (ragequit, jailed, new membership?)

  const [apiData, setApiData] = useState()
  const [nodes, setNodes] = useState()
  const [links, setLinks] = useState()
  const [loading, setLoading] = useState(false)
  const [minMax, setMinMax] = useState<number[]>([])
  const [timestamp, setTimestamp] = useState<number>()
  const [onlyRelated, setOnlyRelated] = useState(false)
  const [sharePower, setSharePower] = useState(false)
  const [search, setSearch] = useState('')
  const [searchList, setSearchList] = useState<daoObject[]>()
  const [provisionalList, setProvisionalList] = useState<daoObject[]>([])
  const [chainFilter, setChainFilter] = useState()
  // const [daoSelected, setDaoSelected] = useState()
  const [dataHolder, setDataHolder] = useState<daoObject[]>()
  //--------------------------------- TODO LIST
  // keep objects in session storage for user save/delete
  // add GUI to test
  // copy address / open etherscan
  //

  //--------------------------------- DATA TO APP
  const [list, setList] = useState([
    '0xef3d8c4fbb1860fceab16595db7e650cd5ad51c1', // starter (daoHausWarcamp)
  ])
  const getApiMetadata = async () => {
    try {
      console.log(`fetching daoMeta`)
      const response = await fetch(
        'https://daohaus-metadata.s3.amazonaws.com/daoMeta.json'
      )
      return response.json()
    } catch (err) {
      console.error(err)
    }
  }
  //--------------------------------- DATA FILTERS

  const filteredDaos = (chain) => {
    if (apiData) {
      const filteredChainDAOs = Object.values(apiData).filter((x) => {
        return x[0].network === chainFilter
      })
      return filteredChainDAOs
    }
  }

  useEffect(() => {
    function filterList(data) {
      const found = Object.values(data).filter((x) => {
        return x[0].name.toLowerCase().includes(search.toLowerCase())
      })
      if (found.length) {
        setSearchList(found)
      } else {
        setSearchList([])
      }
    }
    if (search.length > 3 && apiData) {
      if (chainFilter) {
        filterList(filteredDaos(chainFilter))
      } else {
        filterList(apiData)
      }
    } else {
      setSearchList(null)
    }
  }, [search])

  const handleProvisionalList = (inOut, dao) => {
    if (inOut) {
      setProvisionalList(provisionalList.concat(dao))
    } else {
      if (provisionalList) {
        const filteredOut = provisionalList.filter((x) => {
          return x !== dao
        })
        setProvisionalList(filteredOut)
      }
    }
  }

  //--------------------------------- DATA TO GRAPH
  const updateProps = async () => {
    const totalPromises = []
    list.forEach((x) => {
      totalPromises.push(getGraphProps(x))
    })
    Promise.all(totalPromises).then((results) => {
      setDataHolder(results)
    })
  }

  async function addDaos(daosList) {
    const newDataPromises = []
    provisionalList.forEach((x) => {
      newDataPromises.push(getGraphProps(x.contractAddress))
    })
    Promise.all(newDataPromises).then((results) => {
      setDataHolder(dataHolder.concat(results))
      setProvisionalList([])
    })
  }

  // async function addDao(daoAddress) {
  //   const newData = await getGraphProps(daoAddress)
  //   if (!newData.error) {
  //     // handle errors! there are many groups with no member, no moloch, etc
  //     // moloch v1 has no image and does not handle that
  //     const newArray = dataHolder.concat(newData)
  //     setDataHolder(newArray)
  //   }
  // }

  function createData(data) {
    const nnodes = data.moloch.members.map((x) => {
      let minion
      if (x.isSafeMinion?.id) {
        minion = true
      } else {
        minion = false
      }
      return {
        id: x.memberAddress,
        label: x.memberAddress, // ENS would be just.. great..
        group: 3,
        size: 2,
        shares: x.shares,
        loot: x.loot,
        isSafeMinion: minion,
        createdAt: parseInt(x.createdAt, 10),
        hidden: x.createdAt > timestamp,
      }
    })
    const nlinks = nnodes.map((x) => {
      return {
        source: data.daoMetadata.contractAddress,
        target: x.id,
        shares: parseInt(x.shares, 10) / parseInt(data?.moloch.totalShares, 10),
        loot: parseInt(x.loot, 10) / parseInt(data?.moloch.totalLoot, 10),
        value: 1,
        hidden: x.hidden,
      }
    })
    nnodes.push({
      id: data?.daoMetadata?.contractAddress,
      label: data?.daoMetadata?.name,
      image: data?.daoMetadata?.avatarImg,
      hidden: false,
      group: 0,
      size: 10,
    })
    return { nnodes, nlinks }
  }

  useEffect(() => {
    const acumNodes = []
    const acumLinks = []
    if (dataHolder) {
      const viewList = dataHolder.filter((x) => x.hidden === false)

      for (let i = 0; i < viewList.length; i++) {
        // console.log(`creating view data for ${JSON.stringify(viewList[i])}`)
        const { nnodes, nlinks } = createData(viewList[i])
        acumNodes.push(nnodes)
        acumLinks.push(nlinks)
      }

      const uniqueNodes = acumNodes.flat().reduce((unique, o) => {
        if (!unique.some((obj) => obj.id === o.id)) {
          unique.push(o)
        }
        return unique
      }, [])

      const onlyRel = uniqueNodes.reduce((rep, o) => {
        const linksSum = acumLinks.flat().filter((x) => x.target === o.id)
        if (linksSum.length > 1 || o.group === 0) {
          // console.log(`passes ${JSON.stringify(o)}`)
          rep.push(o)
        }
        return rep
      }, [])
      const validNodes = onlyRel.map((x) => {
        return x.target
      })

      const onlyRelLinks = acumLinks.flat().reduce((valid, o) => {
        // not working.. have to think it better
        if (validNodes.includes(o.target.id)) {
          valid.push(o)
        }
        return valid
      }, [])

      if (onlyRelated) {
        setNodes(onlyRel)
        setLinks(onlyRelLinks)
      } else {
        setNodes(uniqueNodes)
        setLinks(acumLinks.flat())
      }
    }
  }, [dataHolder, timestamp])

  useEffect(() => {
    let maxVal
    if (nodes?.length) {
      const listOfTimestamps = nodes.map((x) => {
        if (typeof x.createdAt === 'number') return x.createdAt
      })
      const fixed = listOfTimestamps.filter((x) => {
        return x != null
      })
      maxVal = Math.max(...fixed)
      setMinMax([Math.min(...fixed), maxVal])
    }
    if (!timestamp) {
      setTimestamp(maxVal)
    }
  }, [nodes])

  useEffect(async () => {
    setLoading(true)
    // first check session storage
    const daoHausMetadata = await getApiMetadata()
    if (daoHausMetadata) {
      // maybe use session storage to make it faster
      setApiData(daoHausMetadata)
    }
    updateProps()
    setLoading(false)
  }, [])

  return (
    <Stack>
      <Helmet>
        <title> DAO Vis Tool</title>
      </Helmet>
      {loading && <LoadingLogo />}
      <HStack>
        <VStack align="stretch" spacing={4}>
          <Select
            style={{
              color: 'gray',
            }}
            onChange={(e) => {
              setChainFilter(e.target.value)
            }}
          >
            <option value="">all networks</option>
            <option value="matic">matic</option>
            <option value="arbitrum">arbitrum</option>
            <option value="mainnet">mainnet</option>
            <option value="rinkeby">rinkeby</option>
            <option value="kovan">kovan</option>
            <option value="xdai">xdai</option>
          </Select>

          <p style={{ color: 'white' }}>
            Right click on node to copy to clipboard
          </p>
          <p style={{ color: 'white' }}>TODO: save to session storage</p>
          <span style={{ color: 'white' }}>
            <input
              type="string"
              value={search}
              style={{
                borderRadius: '10px',
                padding: '10px',
                border: '1px solid white',
                backgroundColor: 'transparent',
              }}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for the DAO"
            />
            {search && (
              <button
                style={{
                  marginLeft: '15px',
                  borderRadius: '5px',
                  padding: '6px',
                  border: '1px solid white',
                }}
                onClick={() => setSearch('')}
              >
                ERASE
              </button>
            )}
          </span>
          {searchList?.length && (
            <TableContainer>
              <Table
                variant="simple"
                style={{
                  color: 'white',
                  fontSize: '14px',
                }}
              >
                <TableCaption>Results of the search</TableCaption>
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Network</Th>
                    <Th>Select</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {searchList.map((x, i) => {
                    return (
                      <Tr key={i}>
                        <Td>{x[0].name}</Td>
                        <Td>{x[0].network}</Td>
                        <Td>
                          <Checkbox
                            onChange={(e) =>
                              handleProvisionalList(e.target.checked, x)
                            }
                          />
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          )}
          {provisionalList?.length && (
            <TableContainer>
              <Table
                variant="simple"
                style={{
                  color: 'white',
                  fontSize: '14px',
                }}
              >
                <TableCaption>Provisional list</TableCaption>
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Network</Th>
                    <Th>Select</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {provisionalList.map((x, i) => {
                    return (
                      <Tr key={i}>
                        <Td>{x.name}</Td>
                        <Td>{x.network}</Td>
                        <Td>
                          <Checkbox
                            isChecked={provisionalList.some(
                              (y) => y.name === x.name
                            )}
                            onChange={(e) =>
                              handleProvisionalList(e.target.checked, x)
                            }
                          />
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
              <Center>
                <button
                  style={{
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '10px',
                    padding: '10px',
                  }}
                  onClick={() => addDaos(provisionalList)}
                >
                  Add list
                </button>
              </Center>
            </TableContainer>
          )}
          {minMax && timestamp && (
            <>
              <Slider
                aria-label="slider-ex-2"
                colorScheme="pink"
                defaultValue={30}
                min={minMax[0]}
                max={minMax[1]}
                value={timestamp}
                onChange={(val) => {
                  setTimestamp(parseInt(val))
                }}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <p
                style={{
                  color: 'white',
                }}
              >
                Date selected: {new Date(timestamp * 1000).toLocaleDateString()}
              </p>
            </>
          )}
          <Checkbox
            style={{ color: 'white' }}
            isChecked={sharePower}
            onChange={(e) => setSharePower(e.target.checked)}
          >
            Members share power
          </Checkbox>
          <Checkbox
            disabled
            style={{ color: 'white' }}
            isChecked={onlyRelated}
            onChange={(e) => setOnlyRelated(e.target.checked)}
          >
            Only related
          </Checkbox>

          {dataHolder?.length && (
            <div>
              {dataHolder.map((i, index) => {
                return (
                  <div key={index} style={{ color: 'white' }}>
                    {i?.daoMetadata?.name}
                    <Button
                      type=""
                      style={{ marginLeft: '16px' }}
                      variant="outline"
                      onClick={() => {
                        setDataHolder(
                          dataHolder.map((el, item) =>
                            item === index ? { ...el, hidden: !el.hidden } : el
                          )
                        )
                      }}
                    >
                      {dataHolder[index].hidden ? 'Unhide' : 'Hide'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setList(list.filter((_, i) => i !== index))
                        setDataHolder(dataHolder.filter((_, i) => i !== index))
                      }}
                    >
                      Out
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </VStack>
        {nodes && links && timestamp && (
          <ForceGraph
            nodes={nodes}
            links={links}
            sharePower={sharePower}
            lowLimitTimestamp={timestamp}
          />
        )}
      </HStack>
    </Stack>
  )
}

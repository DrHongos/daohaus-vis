import { Avatar } from '@chakra-ui/avatar'
import { Button } from '@chakra-ui/button'
import { Box, Flex, Stack, Text } from '@chakra-ui/layout'
import { FC } from 'react'
import { Link } from 'react-router-dom'

import { getImageFromIPFSHash } from '../utils/web3'
type DAOCardProps = {
  dao: {
    name: string
    address: string
    description: string
    avatar: string
  }
}

export const DAOCard: FC<DAOCardProps> = ({ dao }) => {
  return (
    <Flex
      direction="column"
      bg="brand.darkBlue1"
      p="6"
      border="1px solid #C4C4C4"
      borderRadius="md"
      w="80"
      h="56"
      justify="space-between"
    >
      <Box>
        <Stack spacing="4">
          <Flex alignItems="center">
            <Avatar w="12" src={getImageFromIPFSHash(dao.avatar)} mr="4" />
            <Text fontSize="xl">{dao.name}</Text>
          </Flex>
          <Text>{dao.description}</Text>
        </Stack>
      </Box>
      <Box justifySelf="flex-end" alignSelf="flex-end">
        <Link to={`/dao/${dao.address}`}>
          <Button variant="outline">View Books</Button>
        </Link>
      </Box>
    </Flex>
  )
}
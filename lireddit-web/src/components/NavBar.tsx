import { Box, Button, Flex, Link } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useLogoutMutation, useMeQuery } from '../generated/graphql'
import { isaServer } from '../utils/isServer'

interface NavBarProps {

}

export const NavBar: React.FC<NavBarProps> = ({ }) => {
  const [{fetching: logoutFetching}, logout] = useLogoutMutation()
  const [{ data, fetching }] = useMeQuery()

  let body = null

  if (fetching) {

  } else if (!data?.me) {
    body = (
      <>
        < NextLink href="/login" >
          <Link color='white' mr={2}>Login</Link>
        </NextLink >
        <NextLink href="/register">
          <Link color='white' mr={2}>Register</Link>
        </NextLink>
      </>
    )
  } else {
    body = (
      <Flex>
        <Box mr={2}>{data.me.username}</Box>
        <Button
          onClick={() => { logout() }}
          variant="link"
          isLoading={logoutFetching}
        >
          Logout
        </Button>
      </Flex>
    )
  }

  return (
    <Flex bg='tomato' p={4} ml={"auto"}>
      <Box ml={"auto"}>
        {body}
      </Box>
    </Flex>
  );
}
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { Box, IconButton } from '@chakra-ui/react';
import React from 'react'
import NextLink from 'next/link';
import { useDeletePostMutation, useMeQuery } from '../generated/graphql';


interface EditDeletePostButtonsProps {
	id: number;
	creatorId: number;
}

export const EditDeletePostButtons: React.FC<EditDeletePostButtonsProps> = ({ id, creatorId }) => {
	const [, deletePost] = useDeletePostMutation()
	const [{ data: meData }] = useMeQuery()

	if (meData?.me?.id !== creatorId) {
		return null
	}

	return (
		<Box>
			<NextLink href={{
				pathname: '/post/edit/[id]',
				query: { id }
			}}>
				<IconButton
					mr={4}
					icon={<EditIcon />}
					aria-label='edit post'
				/>
			</NextLink>
			<IconButton
				icon={<DeleteIcon />}
				aria-label='delete post'
				onClick={() => {
					deletePost({ id })
				}}
			/>
		</Box>
	);
}
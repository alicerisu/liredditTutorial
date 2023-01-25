import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { Flex, IconButton } from '@chakra-ui/react';
import React from 'react';
import { useState } from 'react';
import { PostSnippetFragment, useVoteMutation } from '../generated/graphql';

interface UpDootSectionProps {
	post: PostSnippetFragment
}

export const UpDootSection: React.FC<UpDootSectionProps> = ({ post }) => {
	const [loadingState, setLoadingState] = useState<'updoot-loading' | 'downdoot-loading' | 'not-loading'>()
	const [, vote] = useVoteMutation()
	return (
		<Flex direction='column' justifyContent='center' alignItems='center' mr={4}>
			<IconButton
				aria-label='Upvote'
				icon={<ChevronUpIcon />}
				boxSize={6}
				isLoading={loadingState === 'updoot-loading'}
				colorScheme={post.voteStatus == 1 ? "green" : undefined}
				onClick={async () => {
					if (post.voteStatus ===1) {
						return
					}
					setLoadingState('updoot-loading')
					await vote({
						postId: post.id,
						value: 1
					})
					setLoadingState('not-loading')
				}}
			/>
			{post.points}
			<IconButton
				aria-label='DownVote'
				icon={<ChevronDownIcon />}
				boxSize={6}
				colorScheme={post.voteStatus == -1 ? "red" : undefined}
				isLoading={loadingState === 'downdoot-loading'}
				onClick={async () => {
					if (post.voteStatus === -1) {
						return
					}
					setLoadingState('downdoot-loading')
					await vote({
						postId: post.id,
						value: -1
					})
					setLoadingState('not-loading')
				}}
			/>
		</Flex>
	);
}
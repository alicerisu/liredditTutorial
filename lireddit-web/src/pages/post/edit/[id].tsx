import { Box, Button } from '@chakra-ui/react';
import { Form, Formik } from 'formik';
import { withUrqlClient } from 'next-urql';
import { useRouter } from 'next/router';
import React from 'react';
import { InputField } from '../../../components/InputField';
import { Layout } from '../../../components/Layout';
import { usePostQuery, useUpdatePostMutation } from '../../../generated/graphql';
import { createUrqlClient } from '../../../utils/createUrqlClient';
import { UseGetIntId } from '../../../utils/useGetIntId';

export const EditPost: React.FC<{}> = ({ }) => {
	const router = useRouter()
	const intId = UseGetIntId()
	const [{ data, error, fetching }] = usePostQuery({
		pause: intId === -1,
		variables: {
			id: intId
		}
	})
	const [, updatePost] = useUpdatePostMutation()

	if (fetching) {
		return (
			<Layout>
				<div>loading...</div>
			</Layout>
		)
	}

	if (error) {
		return <div>{error.message}</div>
	}

	if (!data?.post) {
		return (
			<Layout>
				<Box>
					Could not find Post
				</Box>
			</Layout>
		)
	}

	return (<Layout variant='small'>
		<Formik
			initialValues={{ title: data.post.title, text: data.post.text }}
			onSubmit={async (values) => {
				await updatePost({ id: intId, ...values })
				router.back()
			}}
		>
			{({ isSubmitting }) => (
				<Form>
					<InputField
						name="title"
						placeholder="title"
						label="Titlel"
					/>
					<Box mt={4}>
						<InputField
							name="text"
							placeholder="text"
							label="Body"
							textarea
						/>
					</Box>
					<Button
						mt={4}
						type='submit'
						isLoading={isSubmitting}
					>
						Update Post
					</Button>
				</Form>
			)}
		</Formik>
	</Layout>);
}

export default withUrqlClient(createUrqlClient)(EditPost)

import { Box, Button, Link } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import { NextPage } from 'next'
import { withUrqlClient } from 'next-urql';
import router, { useRouter } from 'next/router';
import { useState } from 'react';
import { InputField } from '../../components/InputField';
import { Wrapper } from '../../components/Wrapper';
import { useChangePasswordMutation } from '../../generated/graphql';
import { createUrqlClient } from '../../utils/createUrqlClient';
import { toErrorMap } from '../../utils/toErrorMap';
import NextLink from 'next/link'

const ChangePassword: NextPage = () => {
	const router = useRouter()
	const [, changePassword] = useChangePasswordMutation()
	const [tokenError, setTokenError] = useState('')

	return (<Wrapper variant='small'>
		<Formik
			initialValues={{ newPassword: "" }}
			onSubmit={async (values, { setErrors }) => {
				const response = await changePassword({
					token: typeof router.query.token === 'string' ? router.query.token ? '',
					newPassword: values.newPassword
				});
				if (response.data?.changePassword.errors) {
					const errorMap = toErrorMap(response.data.changePassword.errors)
					if ('token' in errorMap) {
						setTokenError(errorMap.token)
					}
					setErrors(errorMap)
				} else if (response.data?.changePassword.user) {
					router.push("/")
				}
			}}
		>
			{({ isSubmitting }) => (
				<Form>
					<InputField
						name="newPassword"
						placeholder="new password"
						label="New Password"
						type="password"
					/>
					{tokenError ? (
						<Box>
							<Box color='red'>{tokenError}</Box>
							<NextLink href='/forgot-password'>
								<Link>Go forget it again</Link>
							</NextLink>
						</Box>
					) : null}
					<Button
						mt={4}
						type='submit'
						isLoading={isSubmitting}
					>Change Password
					</Button>
				</Form>
			)}
		</Formik>
	</Wrapper>)
}

export default withUrqlClient(createUrqlClient, { ssr: true })(ChangePassword)


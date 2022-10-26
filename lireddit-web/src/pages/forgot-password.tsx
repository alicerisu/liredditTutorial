import { Flex, Button, Box } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import { withUrqlClient } from 'next-urql';
import Link from 'next/link';
import router from 'next/router';
import React, { useState } from 'react'
import { InputField } from '../components/InputField';
import { Wrapper } from '../components/Wrapper';
import { useForgotPasswordMutation } from '../generated/graphql';
import { createUrqlClient } from '../utils/createUrqlClient';
import { toErrorMap } from '../utils/toErrorMap';
import login from './login';


const ForgotPassword: React.FC<{}> = ({ }) => {
	const [complete, setComplete] = useState<Boolean>(false)
	const [, forgotPassword] = useForgotPasswordMutation()

	return (<Wrapper variant='small'>
		<Formik initialValues={{ email: "" }}
			onSubmit={async ({ email }) => {
				await forgotPassword({ email });
				setComplete(true)
			}}
		>
			{({ isSubmitting }) => complete ?
				(<Box>
					E-mail sent with the recuperation link
				</Box>)
				: (
					<Form>
						<InputField
							name="email"
							placeholder="email"
							label="Email"
						/>
						<Button
							mt={4}
							type='submit'
							isLoading={isSubmitting}
						>Forgot Password
						</Button>
					</Form>
				)}
		</Formik>
	</Wrapper>);
}

export default withUrqlClient(createUrqlClient)(ForgotPassword)
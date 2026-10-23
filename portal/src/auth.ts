import { betterAuth } from 'better-auth';

export type AppEnv = Omit<Env, 'APP_URL'> & {
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
};

export function createAuth(env: AppEnv, resetHandler?: (url: string) => Promise<void>) {
  return betterAuth({
    appName: '会员题库', baseURL: env.APP_URL, secret: env.BETTER_AUTH_SECRET,
    database: env.DB, trustedOrigins: [env.APP_URL],
    emailAndPassword: {
      enabled: true, minPasswordLength: 10, maxPasswordLength: 128,
      requireEmailVerification: false, revokeSessionsOnPasswordReset: true,
      sendResetPassword: resetHandler ? async ({url}) => resetHandler(url) : undefined,
    },
    session: {expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: {enabled: false}},
    advanced: {useSecureCookies: env.APP_URL.startsWith('https:'), ipAddress: {ipAddressHeaders:['cf-connecting-ip']}},
    rateLimit: {enabled: true, storage: 'database', window: 60, max: 30},
    logger: {level:'error',log: () => console.error(JSON.stringify({event:'authentication_error'}))},
  });
}

export async function identity(request: Request, env: AppEnv) {
  const session = await createAuth(env).api.getSession({headers:request.headers});
  if (!session) return null;
  const membership = await env.DB.prepare('SELECT role,status FROM memberships WHERE user_id=?').bind(session.user.id).first<{role:'admin'|'member';status:'active'|'suspended'}>();
  return {user:session.user,membership};
}

import { betterAuth } from 'better-auth';

export type AppEnv = Omit<Env, 'APP_URL'> & {
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

export function createAuth(env: AppEnv) {
  return betterAuth({
    appName: '会员题库', baseURL: env.APP_URL, secret: env.BETTER_AUTH_SECRET,
    database: env.DB, trustedOrigins: [env.APP_URL],
    emailAndPassword: {enabled: false},
    socialProviders: env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? {
      github: {
        clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: profile => ({name: profile.login, githubLogin: profile.login}),
      },
    } : {},
    user: {additionalFields: {githubLogin: {type: 'string', required: false, input: false, fieldName: 'github_login'}}},
    account: {accountLinking: {enabled: false, disableImplicitLinking: true}, encryptOAuthTokens: true, storeStateStrategy: 'database'},
    session: {expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: {enabled: false}},
    advanced: {useSecureCookies: env.APP_URL.startsWith('https:'), ipAddress: {ipAddressHeaders:['cf-connecting-ip']}},
    rateLimit: {enabled: true, storage: 'database', window: 60, max: 30},
    logger: {level:'error',log: () => console.error(JSON.stringify({event:'authentication_error'}))},
  });
}

export async function identity(request: Request, env: AppEnv) {
  const session = await createAuth(env).api.getSession({headers:request.headers});
  if (!session) return null;
  const account = await env.DB.prepare("SELECT accountId FROM account WHERE userId=? AND providerId='github'").bind(session.user.id).first<{accountId:string}>();
  if (!account || !/^\d+$/.test(account.accountId)) return null;
  if(account.accountId===env.OWNER_GITHUB_ID){
    const now=Date.now();
    await env.DB.batch([
      env.DB.prepare("UPDATE activation_codes SET used_by=?,redeemed_at=? WHERE id='github-owner' AND bound_github_id=? AND role='admin' AND used_by IS NULL AND revoked=0").bind(session.user.id,now,account.accountId),
      env.DB.prepare("INSERT INTO memberships(user_id,github_id,role,status,code_id,activated_at) SELECT ?,bound_github_id,'admin','active',id,? FROM activation_codes WHERE id='github-owner' AND bound_github_id=? AND used_by=? AND revoked=0 ON CONFLICT(user_id) DO NOTHING").bind(session.user.id,now,account.accountId,session.user.id),
    ]);
  }
  const membership = await env.DB.prepare('SELECT role,status FROM memberships WHERE user_id=? AND github_id=?').bind(session.user.id,account.accountId).first<{role:'admin'|'member';status:'active'|'suspended'}>();
  return {user:session.user,github:{id:account.accountId,login:session.user.githubLogin||session.user.name},membership};
}

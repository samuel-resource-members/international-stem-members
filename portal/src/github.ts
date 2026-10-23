export type GitHubIdentity = {id:string;login:string};
export async function resolveGitHubUser(login:string, service:Pick<Fetcher,'fetch'>):Promise<GitHubIdentity|null> {
 const response=await service.fetch('https://resources.internal/github-user/'+encodeURIComponent(login));
 if(response.status===404)return null;
 if(!response.ok)throw new Error('GitHub lookup unavailable');
 const profile=await response.json() as {id:number;login:string};
 if(!Number.isSafeInteger(profile.id)||profile.id<=0||typeof profile.login!=='string')throw new Error('Invalid GitHub identity');
 return {id:String(profile.id),login:profile.login};
}

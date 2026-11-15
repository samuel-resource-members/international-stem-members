import {readFileSync,writeFileSync} from 'node:fs';
import {marked} from 'marked';

const origin='https://stem-member-library.xpartara.workers.dev';
const markdown=readFileSync(new URL('../public/guide.md',import.meta.url),'utf8');
const guide=marked.parse(markdown,{async:false});
writeFileSync(new URL('../dist/guide.md',import.meta.url),markdown);
writeFileSync(new URL('../dist/guide.html',import.meta.url),`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>会员使用指南 · 国际课程与竞赛题库</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/portal.css"><link rel="alternate" type="text/markdown" href="/guide.md"><link rel="describedby" href="/llms.txt"></head>
<body><header class="site-top"><a href="/" class="wordmark"><span class="book-mark" aria-hidden="true">▥</span> 国际课程与竞赛题库</a><nav><a href="/guide" aria-current="page">使用指南</a><a href="/">会员入口</a></nav></header><main class="page guide"><article class="panel">${guide}</article><p><a href="/guide.md">阅读纯文本指南</a> · <a href="/">进入会员题库</a></p></main></body></html>\n`);
writeFileSync(new URL('../dist/llms.txt',import.meta.url),`# 国际课程与竞赛题库

> 数学、物理、化学与生物会员题库。公开指南说明账号开通、仓库授权与按需获取资料的方法。

公开教材与分类目录支持免登录下载。会员网站的题目检索和账户服务需登录。

## 使用入口

- [会员使用指南](${origin}/guide.md): 完整开通步骤与下载命令。
- [网页使用指南](${origin}/guide): 无需执行 JavaScript 即可阅读。
- [会员入口](${origin}/): 使用本人 GitHub 账号登录并激活。
- [公开教材与讲义](https://github.com/samuel-resource-members/international-stem-members/blob/main/catalog/books.md): 选择课程并直接下载 PDF。
`);

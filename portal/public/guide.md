# 会员使用指南

在网页中检索题目，或使用自己的 GitHub 账号按课程、题号获取资料。

[进入会员题库](https://stem-member-library.xpartara.workers.dev/) · [账户与仓库邀请](https://stem-member-library.xpartara.workers.dev/account)

## 1. 确认你的 GitHub 账号

已有 GitHub 账号，请把用户名提供给管理员；没有账号，请先在 [GitHub](https://github.com/signup) 注册，再提供用户名。管理员会为这个账号开通专属激活码。

激活码绑定指定的 GitHub 账号，转发给其他账号无法使用。注册、登录及必要的安全验证需要由你本人完成。

## 2. 登录并激活会员

打开[会员入口](https://stem-member-library.xpartara.workers.dev/)，选择「使用 GitHub 登录」，确认是开通时提供的账号，再输入专属激活码。

激活后可以在网页中使用[题目检索](https://stem-member-library.xpartara.workers.dev/library)和[资源库](https://stem-member-library.xpartara.workers.dev/resources)。网页下载无需克隆仓库。

## 3. 接受仓库邀请

需要在电脑或自动化环境中获取资料时，进入[账户页面](https://stem-member-library.xpartara.workers.dev/account#github-access)，在「GitHub 仓库访问」中点击「接受仓库邀请」，并在 GitHub 上确认接受。此步骤通常只需完成一次。

如果显示正在开通，请稍后刷新账户页面；如果需要重新检查，点击「检查访问状态」。始终使用同一个 GitHub 账号。

网站登录与电脑上的 GitHub 授权各自独立。接受邀请后，使用该账号授权的浏览器或终端才能访问私有仓库；只具备普通网页读取能力的客户端无法读取私有资料。

本指南无需登录即可阅读。题目、资料清单和下载仍需有效的会员权限。激活码用于开通网站会员，不能代替 GitHub 登录凭证；不要提供密码或访问令牌给他人。

## 4. 在电脑上连接仓库

准备好 [GitHub CLI](https://cli.github.com/) 与 Python 3.9 或以上版本。在需要获取资料的电脑或终端中，先检查当前授权账号：

```sh
gh auth status --hostname github.com
```

如果尚未登录，或当前账号与会员绑定账号不同，请使用会员账号登录；需要确认登录或安全验证时，由你本人完成：

```sh
gh auth login --hostname github.com --web
```

确认当前账号有仓库权限后运行：

```sh
gh repo clone samuel-resource-members/international-stem-members
cd international-stem-members
```

如果本机已经有这个仓库，进入已有目录，运行 `git pull --ff-only` 更新即可。

仓库包含题目索引与获取入口。PDF 和资料包保存在私有 Releases 中，克隆仓库后仍需按需获取。

## 5. 按课程或题号获取资料

查看可用课程、题号与资料包：

```sh
python3 scripts/member_download.py courses
python3 scripts/member_download.py questions --course amc8 --limit 5
python3 scripts/member_download.py list --name AMC8
```

获取某课程资料，先查看所需下载量，再执行：

```sh
python3 scripts/member_download.py materialize --course amc8 --dry-run
python3 scripts/member_download.py materialize --course amc8 --output resources
```

需要单题时，从题目列表中选择完整题号，通过 `materialize --question` 获取；也可以通过 `materialize --path` 选择列表中的完整文件路径。能定位到单题文件时只获取所选题目，其余情况会在下载计划中列明所需完整资料包。

获取完整资料包：

```sh
python3 scripts/member_download.py download --name AMC8 --dry-run
python3 scripts/member_download.py download --name AMC8 --output resources
```

所有列举与下载命令均支持 `--json`。重复的 `--course`、`--question`、`--name` 或 `--asset` 可一次选择多项；不同类型条件取交集。

下载会核对 SHA-256。再次运行相同命令，已核对的文件会跳过；下载中断时，当前未完成的资料包需要重新下载，之前完成的 PDF 会保留。目标目录中的 `.member-download.json` 记录已核对的文件摘要，请保留。已有文件摘要不符时会停止，只有加 `--replace` 才会替换。

默认按需获取。确需完整获取时使用 `--all`；全库资料较大，请先加 `--dry-run` 查看下载量。

## 遇到访问问题

- 激活码不能使用：检查当前 GitHub 账号是否与开通时一致。新注册的账号需要先将用户名提供给管理员，再领取绑定该账号的码。
- 仓库显示 404 或没有访问权限：先确认已激活会员、已接受邀请，并检查浏览器及 `gh auth status` 中的账号。
- 网页能用，终端仍无法下载：使用有仓库权限的同一 GitHub 账号完成终端授权。网站登录不会自动给其他设备或软件授权。
- 无法使用终端：可以直接在会员网站中检索和下载；自动获取需要具备终端执行与 GitHub 授权能力的客户端。

各考试试题与评分资料的版权归其权利人所有。

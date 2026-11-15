# 会员使用指南

直接打开[教师教材目录](https://github.com/samuel-resource-members/international-stem-members/blob/main/catalog/books.md)选择课程，点击书名即可下载 PDF。[原卷与分类题目录](https://github.com/samuel-resource-members/international-stem-members/blob/main/catalog/README.md)也可免登录浏览。以下步骤适用于会员网站。

[进入会员题库](https://stem-member-library.xpartara.workers.dev/) · [账户与仓库邀请](https://stem-member-library.xpartara.workers.dev/account)

## 1. 确认你的 GitHub 账号

已有 GitHub 账号，请把用户名提供给管理员；没有账号，请先在 [GitHub](https://github.com/signup) 注册，再提供用户名。管理员会为这个账号开通专属激活码。

激活码绑定指定的 GitHub 账号，转发给其他账号无法使用。注册、登录及必要的安全验证需要由你本人完成。

## 2. 登录并激活会员

打开[会员入口](https://stem-member-library.xpartara.workers.dev/)，选择「使用 GitHub 登录」，确认是开通时提供的账号，再输入专属激活码。

激活后可以在网页中使用[题目检索](https://stem-member-library.xpartara.workers.dev/library)和[资源库](https://stem-member-library.xpartara.workers.dev/resources)。网页下载无需克隆仓库。

## 3. 在电脑上连接仓库

需要批量取用时，可使用 [GitHub CLI](https://cli.github.com/) 与 Python 3.9 或以上版本。先检查 GitHub CLI 登录状态。

```sh
gh auth status --hostname github.com
```

如 CLI 提示登录，请按提示使用自己的 GitHub 账号。

```sh
gh auth login --hostname github.com --web
```

下载公开仓库。

```sh
gh repo clone samuel-resource-members/international-stem-members
cd international-stem-members
```

如果本机已经有这个仓库，进入已有目录，运行 `git pull --ff-only` 更新即可。

仓库包含题目索引与获取入口。PDF 和资料包保存在公开下载区，克隆仓库后仍需按需获取。

## 4. 按课程或题号获取资料

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
- 单本教材链接显示 404 时，从教师教材目录按课程和书名重新打开。
- 终端提示需要登录时，用自己的账号运行 `gh auth login`。
- 手机上可直接打开教师教材目录，点选 PDF。

各考试试题与评分资料的版权归其权利人所有。

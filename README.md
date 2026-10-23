# 国际课程与竞赛题库

数学、物理、化学与生物真题，按课程、考试和专题查阅。

- [会员入口](https://stem-member-library.xpartara.workers.dev)：使用自己的 GitHub 账号登录，凭绑定该账号的专属激活码开通。
- [题目检索](https://stem-member-library.xpartara.workers.dev/library)：按课程与专题搜索题目，保存选题清单。
- [资源库](https://stem-member-library.xpartara.workers.dev/resources)：下载题目与评分资料。
- [提交资料](https://stem-member-library.xpartara.workers.dev/submit)：提交文件或链接，审核通过后与会员共享。

## 在电脑或自动化环境中获取资料

激活后，在账户页面接受 GitHub 仓库邀请。请使用与会员绑定的 GitHub 账号；仓库权限为只读。准备好 [GitHub CLI](https://cli.github.com/) 与 Python 3.9 或以上版本，然后运行：

```sh
gh auth login --hostname github.com --web
gh repo clone samuel-resource-members/international-stem-members
cd international-stem-members
```

仓库包含题目索引与获取入口。PDF 和资料包保存在私有 Releases 中，克隆仓库后仍需按需获取。

查看课程、题号和资料包：

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

也可以从题目列表中选择完整题号，获取该题对应文件：

```sh
python3 scripts/member_download.py materialize --question live-poshenloh-aime-2021i-question_paper__q01 --output resources
```

获取完整资料包：

```sh
python3 scripts/member_download.py download --name AMC8 --dry-run
python3 scripts/member_download.py download --name AMC8 --output resources
```

所有列举与下载命令均支持 `--json`，可供自动化读取。重复的 `--course`、`--question`、`--name` 或 `--asset` 可一次选择多项；不同类型条件取交集。`materialize` 还支持用 `--path` 选择题目列表中的完整文件路径。

能定位到单题文件时，会只恢复所选题目；其余题目保留完整资料包，下载计划中会明确列出。下载会核对 SHA-256；重新运行相同命令时，已通过核对的文件会直接跳过。中断的当前资料包需要重新下载，之前完成的 PDF 会保留。PDF 按索引路径保存在指定目录，临时分片会自动清理；目标目录中的 `.member-download.json` 用于记录已核对的文件摘要，请保留。已有文件摘要不符时会停止，只有显式加 `--replace` 才会替换。

默认不获取全库。确需完整获取时使用 `--all`；全库资料较大，请先加 `--dry-run` 查看下载量。更新索引可在仓库目录运行 `git pull --ff-only`。

各考试试题与评分资料的版权归其权利人所有。

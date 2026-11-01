# 题库维护与批量取用

日常使用从仓库首页进入在线题库，或双击根目录的 `打开题库.command`。课程目录位于 `catalog/README.md`，不需要手工浏览资料分片。

本地入口也可用 `python3 scripts/library_browser.py` 启动，文件取用复用 `member_download.py`，退出后清理临时缓存。`reader.html` 为三类资料的本地入口，`index.html` 仍供在线题目页面构建。

主库冻结后运行其 `scripts/sync_reader.py /path/to/international-stem-members`，再运行本库 `scripts/build_public_catalog.py --human-only`。`data/reader-papers.json` 和 `data/reader-question-files.json` 是带来源提交的派生定位视图；后者只补已分发包里的单题成员路径。书架仅展示本库已具备的书籍文件，不会借用主库权限。

## 目录与职责

| 位置 | 用途 | 更新方式 |
| --- | --- | --- |
| `data/questions.json` | 题目身份、文字、已有分类与文件关联 | 从已冻结的主库内容更新 |
| `data/pdf-store.json` | PDF 的路径、SHA-256、字节数和归档分片 | 资源核验后更新 |
| `catalog/index.json` | 课程机器索引 | 由目录生成器生成 |
| `catalog/courses/` | 每课程的 JSON 与可阅读 Markdown | 由目录生成器生成 |
| `catalog/papers/` | 每卷或题组的 JSON 与可阅读 Markdown | 由目录生成器生成 |
| `questions/<课程>/<题号>.md` | 单题文字、已有分类与来源 | 由完整目录构建生成 |
| `index.html` | 在线题库构建所需的既有浏览器与内容 | 与冻结题目快照保持一致 |
| `portal/` | 已有会员网站 | 复用现有认证与下载权限 |

课程页按章节、年份和试卷连接到单题。大型课程沿用原有试卷目录分组，避免一个 Markdown 页面塞入数千道题。新增 Markdown 不另建目录，不另复制题目正文。

## 更新可阅读目录

仅调整浏览目录时运行：

```sh
python3 scripts/build_public_catalog.py --human-only
```

此命令读取已有 `catalog/index.json`、课程 JSON 和试卷 JSON，生成课程与试卷 Markdown，并更新 `catalog/README.md`。它不更新题目内容、PDF 索引、资源归档或题目分类状态。

题目快照确有更新、需要重新导出全部题目页时，使用原有完整入口：

```sh
python3 scripts/build_public_catalog.py
```

完整入口同时重建机器目录、单题 Markdown 和可阅读目录。不要为了更改首页或查询状态反复运行完整入口。正文和分类是否通过复核，以主库已有记录为准；新目录不提升这些状态。

`portal/scripts/build_catalogue.py` 从既有 `index.html` 读取题目，并按实际题目身份生成题数和课程数。构建仍需要已核验的 `.admin/transfer-receipt.json`，题目下载映射到原有授权下载入口。构建与部署分开进行。

## 按需取得原文件

会员使用自己的 GitHub 权限。列出课程与题号，再按需恢复单题文件：

```sh
python3 scripts/member_download.py courses
python3 scripts/member_download.py questions --course amc8 --limit 5
python3 scripts/member_download.py materialize --course amc8 --dry-run
python3 scripts/member_download.py materialize --question 完整题号 --output resources
```

也可使用 `materialize --path 完整文件路径`。现有下载器按索引找到所需归档，仅提取指定成员，检查摘要，复用已核验文件。只有完整资料包才能定位的条目仍按整包取得；不能把整包链接标成单题文件。

```sh
python3 scripts/member_download.py list --name AMC8
python3 scripts/member_download.py download --name AMC8 --dry-run
python3 scripts/member_download.py download --name AMC8 --output resources
```

以上命令支持 `--json`；重复课程、题号等参数可多选。保留输出目录中的 `.member-download.json`，它用于重复运行时识别已核验文件。

## 原卷与资料归档

PDF 不进入 Git。会员库的 `resources` Release 保存按内容哈希分片的 ZIP，单题记录保留分片、成员路径与摘要；部分已有课程使用 `amc`、`igcse-physics`、`igcse-combined-science` 或 `subject-resources` 下的课程包。

在线「整套资料」页展示命名课程包和学科包，按课程与资料类型筛选。无课程含义的哈希分片不作为普通资源卡片铺开；它们仍由题目记录与文件索引引用，下载路径和权限保留。整套资料页中的按钮明确下载资料包。

主库为 `samuelyeung-space/international-stem-past-papers`，会员库为 `samuel-resource-members/international-stem-members`。会员库是已冻结内容的分发副本，不是另一套独立维护的题目分类。

现有管理员工具位于 `.admin/`：`transfer.py` 处理资源复制，`verify.py` 核对字节数与摘要，`build_members.py` 从指定主库快照生成会员内容。源 commit、目录清单和复制回执须对应同一批内容；不能把不同日期的记录当成已同步证明。同步只补确实新增或变化的对象，不因改导航重新搬运全部资料。

旧归档与路径继续作为兼容入口。删除本地副本前，须证明远端文件字节数、SHA-256 和恢复索引一致；正在写入的目录、用户原件和有效登录状态保留。成书与教材构建资料沿用独立小白书归档，不混入会员题目目录。

## 机器读取路径

程序先读 `catalog/index.json`，再沿课程的 `file` 读取课程 JSON，沿 `papers[].file` 读取试卷 JSON。试卷中的每条记录提供 `question_file`、已有分类、`search_text`、`display`、`answer_candidates` 和已解析的 `files`。

单题位于 `questions/<course_id>/<question_id>.md`。原卷与必要图表优先于 OCR 字符串；空分类字段表示尚无该字段，不表示该题不需要分类。整库 `data/questions.json` 与 `data/pdf-store.json` 仅供程序使用，读者无需逐个打开。

课程 Markdown、试卷 Markdown 和目录 README 都是派生视图；修改对应生成器后重建，避免下次更新覆盖人工补丁。

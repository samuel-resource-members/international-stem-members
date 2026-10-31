# AMC12 · 2015 · Q20

- id: live-poshenloh-amc12-2015b-question_paper__q20
- course: AMC12
- exam: AMC12
- subject: math
- year: 2015
- question_number: 20
- problem_type: 有限状态转移找周期 / 嵌套函数表递推：整行状态进入固定点
- topic_tags: AMC12-2015-B-Q20, live-poshenloh-amc12-2015b-question_paper__q20, AMC12-2015B-Q20

## Statement

For every positive integer \(n,\) let \(\operatorname{mod}_5(n)\) be the remainder obtained when \(n\) is divided by \(5.\) Define a function \(f : \{0, 1, 2, 3, \ldots\}\) \(\times \{0, 1, 2, 3, 4\}\) \(\to \{0, 1, 2, 3, 4\}\) recursively as follows:

\[ \tiny f(i, j) = \begin{cases} \operatorname{mod}_5(j + 1) & \text{if } i = 0 \text{ and } 0 \le j \le 4, \\ f(i - 1, 1) & \text{if } i \ge 1 \text{ and } j = 0, \text{ and} \\ f(i - 1, f(i, j - 1)) & \text{if } i \ge 1 \text{ and } 1 \le j \le 4. \end{cases} \]

What is \(f(2015, 2)?\)


## Text (OCR)

```text
For every positive integer \(n,\) let \(\operatorname{mod}_5(n)\) be the remainder obtained when \(n\) is divided by \(5.\) Define a function \(f : \{0, 1, 2, 3, \ldots\}\) \(\times \{0, 1, 2, 3, 4\}\) \(\to \{0, 1, 2, 3, 4\}\) recursively as follows:

\[ \tiny f(i, j) = \begin{cases} \operatorname{mod}_5(j + 1) & \text{if } i = 0 \text{ and } 0 \le j \le 4, \\ f(i - 1, 1) & \text{if } i \ge 1 \text{ and } j = 0, \text{ and} \\ f(i - 1, f(i, j - 1)) & \text{if } i \ge 1 \text{ and } 1 \le j \le 4. \end{cases} \]

What is \(f(2015, 2)?\)
```

## Source files

- package `AMC12_complete_bank_20261013.zip` (release `amc`): https://github.com/samuel-resource-members/international-stem-members/releases/download/amc/AMC12_complete_bank_20261013.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.

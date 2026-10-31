# AMC12 · 2012 · Q24

- id: live-poshenloh-amc12-2012b-question_paper__q24
- course: AMC12
- exam: AMC12
- subject: math
- year: 2012
- question_number: 24
- problem_type: 质因数指数递推判发散 / 质因数指数迭代发散：化两步阈值并枚举重复素因子
- topic_tags: AMC12-2012-B-Q24, live-poshenloh-amc12-2012b-question_paper__q24, AMC12-2012B-Q24

## Statement

Define the function \(f_1\) on the positive integers by setting \(f_1(1) = 1\) and if \(n = p_1^{e_1} p_2^{e_2} \cdots p_k^{e_k}\) is the prime factorization of \(n \gt 1,\) then \[ \begin{aligned} &f_1(n) = (p_1 + 1)^{e_1 - 1}(p_2 + 1)^{e_2 - 1} \\ &\quad \cdots (p_k + 1)^{e_k - 1}. \end{aligned} \] For every \(m \ge 2,\) let \(f_m(n) = f_1(f_{m-1}(n)).\) For how many \(N\) in the range \(1 \le N \le 400\) is the sequence \((f_1(N), f_2(N), f_3(N), \ldots)\) unbounded? Note: a sequence of positive numbers is unbounded if for every integer \(B,\) there is a member of the sequence greater than \(B.\)


## Text (OCR)

```text
Define the function \(f_1\) on the positive integers by setting \(f_1(1) = 1\) and if \(n = p_1^{e_1} p_2^{e_2} \cdots p_k^{e_k}\) is the prime factorization of \(n \gt 1,\) then \[ \begin{aligned} &f_1(n) = (p_1 + 1)^{e_1 - 1}(p_2 + 1)^{e_2 - 1} \\ &\quad \cdots (p_k + 1)^{e_k - 1}. \end{aligned} \] For every \(m \ge 2,\) let \(f_m(n) = f_1(f_{m-1}(n)).\) For how many \(N\) in the range \(1 \le N \le 400\) is the sequence \((f_1(N), f_2(N), f_3(N), \ldots)\) unbounded? Note: a sequence of positive numbers is unbounded if for every integer \(B,\) there is a member of the sequence greater than \(B.\)
```

## Source files

- package `AMC12_complete_bank_20261013.zip` (release `amc`): https://github.com/samuel-resource-members/international-stem-members/releases/download/amc/AMC12_complete_bank_20261013.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.

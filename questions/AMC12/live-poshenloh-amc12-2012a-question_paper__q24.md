# AMC12 · 2012 · Q24

- id: live-poshenloh-amc12-2012a-question_paper__q24
- course: AMC12
- exam: AMC12
- subject: math
- year: 2012
- question_number: 24
- problem_type: 迭代不动点两侧夹逼排序 / 小于1底数交替迭代幂：夹逼公共不动点后排秩
- topic_tags: AMC12-2012-A-Q24, live-poshenloh-amc12-2012a-question_paper__q24, AMC12-2012A-Q24

## Statement

Let \(\{a_k\}_{k=1}^{2011}\) be the sequence of real numbers defined by \(a_1 = 0.201,\) \(a_2 = (0.2011)^{a_1},\) \(a_3 = (0.20101)^{a_2},\) and \(a_4 = (0.201011)^{a_3},\) and more generally \[ a_k = \begin{cases} \tiny \left(0.\underbrace{20101\ldots0101}_{k+2 \text{ digits}}\right)^{a_{k-1}}, & \tiny \text{if } k \text{ is odd,} \\ \tiny \left(0.\underbrace{20101\ldots01011}_{k+2 \text{ digits}}\right)^{a_{k-1}}, & \tiny \text{if } k \text{ is even.} \end{cases} \]

Rearranging the numbers in the sequence \(\{a_k\}_{k=1}^{2011}\) in decreasing order produces a new sequence \(\{b_k\}_{k=1}^{2011}.\) What is the sum of all the integers \(k,\) \(1 \le k \le 2011,\) such that \(a_k = b_k?\)


## Text (OCR)

```text
Let \(\{a_k\}_{k=1}^{2011}\) be the sequence of real numbers defined by \(a_1 = 0.201,\) \(a_2 = (0.2011)^{a_1},\) \(a_3 = (0.20101)^{a_2},\) and \(a_4 = (0.201011)^{a_3},\) and more generally \[ a_k = \begin{cases} \tiny \left(0.\underbrace{20101\ldots0101}_{k+2 \text{ digits}}\right)^{a_{k-1}}, & \tiny \text{if } k \text{ is odd,} \\ \tiny \left(0.\underbrace{20101\ldots01011}_{k+2 \text{ digits}}\right)^{a_{k-1}}, & \tiny \text{if } k \text{ is even.} \end{cases} \]

Rearranging the numbers in the sequence \(\{a_k\}_{k=1}^{2011}\) in decreasing order produces a new sequence \(\{b_k\}_{k=1}^{2011}.\) What is the sum of all the integers \(k,\) \(1 \le k \le 2011,\) such that \(a_k = b_k?\)
```

## Source files

- package `AMC12_complete_bank_20261013.zip` (release `amc`): https://github.com/samuel-resource-members/international-stem-members/releases/download/amc/AMC12_complete_bank_20261013.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.

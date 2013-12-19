#xface-test-apps

存放引擎测试需要的应用用例，按照以下规则使用本repo

1. 每个应用用例单独一个文件夹
2. 每个应用用例基本结构为

   ```
   ├── ams
   │   ├── README.md
   │   ├── index.html
   │   ├── ...
   ├── portal
   │   ├── README.md
   │   ├── ...

   ```
3. 每个用例必须在README中清楚说明测试方法和验证方法，并保证能够直接用CLI添加
4. 用户使用```xmen app add /path/to/some_app```添加测试
5. 测试案例必须经过review方可提交

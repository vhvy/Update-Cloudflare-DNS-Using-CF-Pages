## Update-Cloudflare-DNS-Using-CF-Pages

使用的 Mikrotik 路由器上由于网络问题无法直接访问 Cloudflare 的 API，又不想给作为网关的路由器假设代理，所以就用 Cloudflare Pages 写了个代理更新 DNS 的小工具。

### 如何使用


1. 克隆本项目，然后在 Cloudflare Pages 中通过`连接到Git`创建项目。

2. 创建过程中的构建设置：

    + 框架：         `None`
    + 构建命令：     `npm i`
    + 构建输出目录： `/public`

3. 在`Cloudflare Pages` 控制面板 `Settings / Variables and Secrets`中配置环境变量：

    + CF_TOKEN: Cloudflare API Token，自行前往 Cloudflare 控制面板获取。
    + CF_ZONE_ID:  Cloudflare ZONE ID，**自行前往** Cloudflare 控制面板获取。
    + VERIFY_TOKEN:  自行设置，调用接口时携带在 header 中鉴权用。

4. 在`Cloudflare Pages` 控制面板 `Deployments / All Deployments`中重新发起部署，因为刚才配置的环境变量需要重新部署才能生效。


5. 如何调用：
    + 请求方法: GET
    + 请求路径: /api/dns
    + URL Query 参数
      + domain: 完整域名，例如 `dnf.qq.com`
      + type: DNS 类型，IPv4 => A ，IPv6 => AAAA
      + content: IP 地址
    + Headers
      + X-Verify-Token: 第三步的 VERIFY_TOKEN

6. 如何二次开发:
   + 克隆项目到本地
   + 复制 `.dev.vars.example` 文件并命名为 `.dev.vars`，在其中配置相关环境变量
   + `npm run dev`
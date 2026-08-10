前言
最近浏览网页看见一个有趣的效果，在导航栏中当hover其中一项的时候背景会从当前项的中间位置出现变大，同时离开的时候背景会变小并到中间位置消失，到从导航栏中一项移动到另一项的时候背景会跟随鼠标移动。

## 使用jquery先实现一下

### 实现代码：

#### HTML

```html
  <nav class="header-nav">
    <div class="menu-bg"></div>
    <ul class="menu-list">
      <li class="menu-item">
        <span>$CTRL</span>
      </li>
      <li class="menu-item">
        <span>Support</span>
      </li>
      <li class="menu-item">
        <span>Security</span>
      </li>
      <li class="menu-item">
        <span>Resources</span>
      </li>
    </ul>
  </nav>
```

#### css

```css
    ul,
    li {
      margin: 0;
      padding: 0;
      list-style: none;
    }

  .header-nav {
     position: relative;
   }

  .header-nav .menu-bg {
    position: absolute;
    background-color: #d1d6d2;
    z-index: 1;
    border-radius: 3vw;
    transition: all 0.4s ease;
    opacity: 1;
  }

  .header-nav .menu-list {
    background-color: #ecefec;
    display: inline-flex;
    border-radius: 1vw;
    position: relative;
  }

  .header-nav .menu-list li {
    font-size: 1.8vw;
    padding: 1vw 1vw;
  }

  .menu-list li span {
    display: block;
    position: relative;
    padding: 1vw 3vw;
    z-index: 2;
  }

  .menu-list li:not(:last-of-type) span::after {
    content: '';
    display: block;
    width: 0.4vw;
    height: 50%;
    background-color: rgb(117, 116, 116);
    position: absolute;
    top: 50%;
    transform: translate(0, -50%);
    right: -1.2vw;
  }
```

#### js

```js
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
  $(document).ready(function () {
    let $menuItem = $('.menu-item')
    let $menuBg = $('.menu-bg')
    // 更新高亮块位置
    function updateMenuBg($target) {
      $menuBg.css($target);
    }
    $menuItem.hover(
      function () {
        let $targetSpan = $(this).find('span')
        let target = {
          width: $targetSpan.outerWidth(),
          height: $targetSpan.outerHeight(),
          left: $targetSpan.position().left,
          top: $targetSpan.position().top,
          opacity: 1,
        }
        updateMenuBg(target)
      },
      function () {
        let $targetSpan = $(this).find('span')
        let $targetMenuItem = $(this)
        let target = {
          width: 0,
          height: 0,
          left: $targetSpan.position().left + $targetSpan.outerWidth() / 2,
          top: $targetMenuItem.outerHeight() / 2,
          opacity: 0,
        }
        updateMenuBg(target)
      }
    );
  })
</script>
```

### 代码片段

[jcode](https://code.juejin.cn/pen/7519801940700889129)

## 使用nuxt实现

### 代码片段

[jcode](https://code.juejin.cn/pen/7519804417827143714)

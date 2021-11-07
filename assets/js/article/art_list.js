$(function () {
  var layer = layui.layer
  var form = layui.form
  var laypage = layui.laypage

  // 定义美化时间的过滤器
  template.defaults.imports.dataFormat = function (date) {
    const dt = new Date(date)
    var y = dt.getFullYear()
    var m = padZero(dt.getMonth() + 1)
    var d = padZero(dt.getDate())
    var hh = padZero(dt.getHours())
    var mm = padZero(dt.getMinutes())
    var ss = padZero(dt.getSeconds())
    return y + '-' + m + '-' + d + ' ' + hh + ':' + mm + ':' + ss
  }

  // 定义补零的函数
  function padZero(n) {
    return n > 9 ? n : '0' + n
  }

  // 定义一个查询的参数对象，将来请求数据的时候，需要将请求参数对象提交到服务器里
  var q = {
    pagenum: 1, // 页码值，默认请求第一页的数据
    pageisze: 2, // 每页显示几条数据，默认每页显示2条
    cate_id: '', // 文章分类的id
    state: '' // 文章的发布状态
  }

  // 进入页面先调用该方法
  initTable()
  initCate()

  // 获取文章列表数据的方法
  function initTable() {
    $.ajax({
      method: 'GET',
      url: '/my/article/list',
      data: q,
      success: function (res) {
        if (res.status !== 0) {
          return layer.msg('获取文章列表失败')
        }
        // 使用模板引擎渲染页面数据
        var htmlStr = template('tpl-table', res)
        $('tbody').html(htmlStr)
        // 调用渲染分页的方法
        renderPage(res.total)
      }
    })
  }

  // 初始化文章分类的方法
  function initCate() {
    $.ajax({
      method: 'GET',
      url: '/my/article/cates',
      success: function (res) {
        if (res.status !== 0) {
          return layer.msg('获取文章分类列表失败')
        }
        // 使用模板引擎渲染页面数据
        var htmlStr = template('tpl-cate', res)
        $('[name-cate_id]').html(htmlStr)
        // 通过 layui 重新渲染表单区域的 UI 结构
        form.render()
      }
    })
  }

  // 为筛选表单绑定 submit 事件
  $('#form-search').on('submit', function (e) {
    e.preventDefault()
    // 获取表单中选中项的值
    var cate_id = $('[name=cate_id]').val()
    var state = $('[name=state]').val()
    // 为查询参数对象 q 对应的属性赋值
    q.cate_id = cate_id
    q.state = state
    // 根据最新的筛选条件，重新渲染表格的数据
    initTable()
  })

  // 定义渲染分页的方法
  function renderPage(total) {
    // 调用 laypage.render()方法来渲染分页结构
    laypage.render({
      elem: 'pageBox', // 分页容器的id
      count: total, // 总数据条数
      limit: q.pageisze, // 每页显示几条数据
      curr: q.pagenum, // 设置默认被选中的分页
      layout: ['count', 'limit', 'prev', 'page', 'next', 'skip'],
      limits: [2, 3, 5, 10],
      // 分页发生切换的时候，触发 jump 回调
      // 触发 jump 回调的方式有两种：
      //    1.点击页码的时候，会触发 jump 回调
      //    2.只要调用了 laypage.render()方法，就会触发 jump 回调
      jump: function (obj, first) {
        // 可以通过 first 的值，来判断是通过哪种方式触发 jump 回调
        // 如果是方式1触发的，那 first 的值为 undefined
        // 如果是方式2触发的，那 first 的值为 true

        // 将最新的页码值，复制到 q 这个查询参数对象中
        q.pagenum = obj.curr
        // 将最新的条目数，赋值到 q 这个查询参数对象里的 pagesize 属性中
        q.pageisze = obj.limit

        // 为了防止死循环，当触发方式为第二种时，对 first 值进行取反后
        //   此时 first 的值为 false ，就不会执行if里的代码了
        // 当触发的方式是第一种时，对 first 值进行取反后
        //   此时 first 的值为 true，调用 initTable()方法
        if (!first) {
          // 根据最新的 q 获取对应的数据列表，并渲染表格
          initTable()
        }
      }
    })
  }

  // 通过代理的形式，为删除按钮绑定点击事件处理函数
  $('tbody').on('click', '.btn-delete', function () {
    // 获取到文章的id
    var id = $(this).attr('data-id')
    // 获取删除删除按钮的个数
    var len = $('.btn-delete').length

    // 询问用户是否要删除数据
    layer.confirm('确认删除?', { icon: 3, title: '提示' }, function (index) {
      $.ajax({
        method: 'GET',
        url: '/my/article/delete/' + id,
        success: function (res) {
          if (res.status !== 0) {
            return layer.msg('删除文章失败')
          }
          layer.msg('删除文章成功')
          /* 自己的理解：
             因为数据已经被删除了，但页面还没有更新，所以此时页面上的数据还是删除前的
             当按钮只有一个时，证明删除的是最后一个数据，
             但删除后调用 initTable()方法时，页码数还是删除前的数据，
             所以在删除了后，该页面上会没有任何数据
             我们需要判断页面上还有没有剩余的数据，如果没有，则让页码值 -1后再调用 initTable 方法
          */

          // 当数据删除完成后，需要判断当前这一页中，是否还有剩余的数据
          // 如果没有剩余的数据了,则让页码值 -1 之后,
          // 再重新调用 initTable 方法
          if (len === 1) {
            // 如果 len 的值等于1，证明删除完毕之后，页面上就没有任何数据了
            // 页码值最小必须是 1
            q.pagenum = q.pagenum === 1 ? 1 : q.pagenum - 1
          }
          initTable()
        }
      })
      layer.close(index)
    })
  })
})

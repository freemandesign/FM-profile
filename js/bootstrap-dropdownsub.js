$(document).on('click', '.dropdown-sub-item>a', function(e) {
	e.preventDefault();
	e.stopPropagation();
	var submenu = $(this).next('.dropdown-menu');
	var menus = submenu.parentsUntil('.dropdown-sub', '.dropdown-menu');
	var wrapper = menus.last();
	var height = wrapper.outerHeight() - wrapper.height() + submenu.height();
	var width = submenu.width();
	var maxWidth = wrapper.width() - wrapper.outerWidth();
	if (wrapper.hasClass('dropdown-menu-right')) {
		maxWidth += wrapper.parent().offset().left + wrapper.parent().outerWidth();
	} else {
		maxWidth -= wrapper.parent().offset().left - $(window).width();
	}
	width = Math.min(maxWidth, width);
	$(this).parent().addClass('open');
	wrapper.css({height:height}).width(width);
	var left = (0 - width) * (menus.length - 1);
	wrapper.children('.dropdown-menu').css({left:left});
}).on('click', '.dropdown-sub-back>a', function(e) {
	e.preventDefault();
	e.stopPropagation();
	var submenu = $(this).closest('.dropdown-sub-item').removeClass('open').parent();
	var menus = submenu.parentsUntil('.dropdown-sub', '.dropdown-menu');
	var wrapper = menus.last();
	var height = wrapper.outerHeight() - wrapper.height() + submenu.height();
	var left = (0 - submenu.width()) * (menus.length - 1);
	wrapper.css({height:height}).children('.dropdown-menu').css({left:left});
}).on('show.bs.dropdown', '.dropdown-sub', function() {
	var wrapper = $(this).children('.dropdown-menu').css({height:''});
	var width = wrapper.outerWidth();
	/*if (wrapper.hasClass('dropdown-menu-right')) {
		var maxWidth = $(this).offset().left + $(this).outerWidth();
	} else {
		var maxWidth = $(window).width() - $(this).offset().left;
	}*/
	wrapper.height(wrapper.height()).outerWidth(width).children('.dropdown-menu').css({left:0});
	wrapper.find('.dropdown-sub-item.open').removeClass('open');
});
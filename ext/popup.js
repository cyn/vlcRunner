window.onload = () => {
    fetch('http://localhost:4545/ping').then(
        () => {
            document.body.innerHTML = 'Приложение запущено и готово к работе';
        },
        () => {
            document.body.innerHTML = 'Запустите приложение &laquo;VLC runner&raquo;';
            console.log('fail');
        }
    );
};

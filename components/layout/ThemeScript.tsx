const script = `
(function(){
  try {
    var m = document.cookie.split(';').map(function(s){return s.trim()}).find(function(s){return s.indexOf('theme=')===0});
    var v = m ? m.slice(6) : '';
    if (v === 'dark' || v === 'light') document.documentElement.setAttribute('data-theme', v);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilState } from "recoil";
import { commonLayoutModeStateAtom } from "../common-layout/common-layout.atom";
import styles from "./side-bar.component.module.scss";
import { ISideBar } from "./side-bar.interface";

const SideBar = (props: ISideBar.Props) => {
  const sideBarElementRef = useRef<HTMLDivElement>(null);
  const [commonLayoutModeState, setCommonLayoutModeState] = useRecoilState(commonLayoutModeStateAtom);
  const [isActiveTransition, setIsActiveTransition] = useState(false);

  const router = useRouter();
  const [menuItems, setMenuItems] = useState<ISideBar.MenuItem[]>([
    { menuName: 'threejs-001-bloom', menuLink: '/threejs-example/threejs-001-bloom' },
    { menuName: 'threejs-002-bloom-selective', menuLink: '/threejs-example/threejs-002-bloom-selective' },
    { menuName: 'threejs-003-glass-material', menuLink: '/threejs-example/threejs-003-glass-material' },
    { menuName: 'threejs-004-multiple-box-cannon', menuLink: '/threejs-example/threejs-004-multiple-box-cannon' },
    { menuName: 'threejs-005-character-moving', menuLink: '/threejs-example/threejs-005-character-moving' },
  ]);

  useEffect(() => {
    setTimeout(() => {
      setIsActiveTransition(true);
    }, 300);
  }, []);

  const menuItemClick = useCallback((item: ISideBar.MenuItem) => {
    router.push(item.menuLink);
  }, [router]);

  const mobileSideBarBackgroundClick = useCallback(() => {
    setCommonLayoutModeState('mobile-basic');
  }, [setCommonLayoutModeState]);

  const isMenuActive = useCallback((item: ISideBar.MenuItem) => {
    const asPath = router.asPath;
    const isActive = asPath.includes(item.menuLink);
    if (isActive && typeof document !== 'undefined') {
      const offsetTop = document.querySelector<HTMLElement>('.ul-menu-list')?.querySelector<HTMLElement>(`li[data-value=${item.menuName}]`)?.offsetTop;
      if (typeof offsetTop === 'number') {
        if (sideBarElementRef.current !== null) {
          sideBarElementRef.current.scrollTop = offsetTop;
        }
      }
    }
    return isActive;
  }, [router.asPath]);

  return (
    <>
      <div 
        className={[
          styles['side-bar-background'],
          styles[commonLayoutModeState],
          isActiveTransition ? styles['animation-duration'] : '',
        ].join(' ')}
        onClick={mobileSideBarBackgroundClick}></div>
      <div 
        ref={sideBarElementRef}
        className={[
          styles['side-bar'],
          styles[commonLayoutModeState],
          isActiveTransition ? styles['animation-duration'] : '',
        ].join(' ')}>
        <ul className={[
            'ul-menu-list',
            styles['menu-list']
          ].join(' ')}>
          {
            menuItems.map((item, index) => {
              return (
                <li 
                  key={index} 
                  className={[
                    styles['item'],
                    isMenuActive(item) ? styles['active'] : '',
                  ].join(' ')}
                  data-value={item.menuName}
                  onClick={e => menuItemClick(item)}>
                  { item.menuName }
                </li>
              )
            })
          }
        </ul>
      </div>
    </>
  );
};

export default SideBar;
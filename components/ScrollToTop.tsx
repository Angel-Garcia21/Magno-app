
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - A utility component that scrolls the window to (0, 0)
 * whenever the current location pathname changes.
 * 
 * Usage: Place this component inside the <BrowserRouter> in your main App file.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;

import type { NextPage } from 'next';
import Head from 'next/head';
import ThreejsCanvasBox from '../components/boxes/threejs-canvas-box/threejs-canvas-box.component';
import CommonLayout from '../components/layouts/common-layout/common-layout.component';
import styles from '../styles/Home.module.scss';

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>three.js research</title>
        <meta name="description" content="three.js research page!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <PageContents />
    </div>
  )
}

const PageContents = () => {
  return (
    <>
      <CommonLayout>
        
      </CommonLayout>
    </>
  );
};

export default Home

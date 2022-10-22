import Head from "next/head";
import CommonLayout from "../components/layouts/common-layout/common-layout.component";

const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-001-bloom</title>
        <meta name="description" content="threejs-001-bloom page!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <CommonLayout>
        <PageContents />
      </CommonLayout>
    </>
  );
};

const PageContents = () => {
  return (
    <>
    
    </>
  );
};  

export default IndexPage;
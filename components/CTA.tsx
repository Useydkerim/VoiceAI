import Image from "next/image";
import Link from "next/link";

interface CtaProps {
    fullPage?: boolean;
}

const Cta = ({ fullPage = false }: CtaProps) => {
    return (
        <section className={fullPage ? "cta-section-full" : "cta-section"}>
            <div className="cta-badge">Start learning your way.</div>
            <h2 className={fullPage ? "text-5xl font-bold" : "text-3xl font-bold"}>
                Build and Personalize Learning Companion
            </h2>
            <Image src="images/cta.svg" alt="cta" width={fullPage ? 500 : 362} height={fullPage ? 320 : 232} />
            <button className={fullPage ? "btn-primary-large" : "btn-primary"}>
                <Image src="/icons/plus.svg" alt="plus" width={fullPage ? 20 : 12} height={fullPage ? 20 : 12}/>
                <Link href="/companions/new">
                    <p className={fullPage ? "text-lg font-semibold" : ""}>Build a New Companion</p>
                </Link>
            </button>
        </section>
    )
}
export default Cta

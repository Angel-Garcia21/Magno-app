import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Property } from '../../types';

// Register Poppins for premium look
Font.register({
    family: 'Poppins',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.ttf', fontWeight: 400 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-600-normal.ttf', fontWeight: 600 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf', fontWeight: 700 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-900-normal.ttf', fontWeight: 900 }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Poppins',
        backgroundColor: '#FFFFFF',
        color: '#1a1a1a',
    },
    header: {
        marginBottom: 30,
        borderBottom: '1pt solid #b4975a',
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        width: 120,
        objectFit: 'contain'
    },
    headerTitleWrap: {
        alignItems: 'flex-end',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 900,
        color: '#b4975a',
        letterSpacing: 1
    },
    headerDate: {
        fontSize: 10,
        color: '#666',
        marginTop: 4
    },
    heroSection: {
        position: 'relative',
        height: 200,
        marginBottom: 30,
        backgroundColor: '#111827',
        borderRadius: 20,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        objectFit: 'cover'
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 900,
    },
    heroRef: {
        color: '#b4975a',
        fontSize: 10,
        fontWeight: 700,
        marginTop: 4
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F9F6F0',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        border: '1pt solid #EADDC6',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 900,
        color: '#b4975a',
    },
    statLabel: {
        fontSize: 7,
        fontWeight: 700,
        color: '#8A7142',
        marginTop: 5,
        textAlign: 'center'
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 900,
        color: '#1a1a1a',
        marginBottom: 15,
        borderLeft: '4pt solid #b4975a',
        paddingLeft: 10,
    },
    portalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    portalCard: {
        width: '31%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        border: '1pt solid #EEE',
    },
    portalLogo: {
        width: '80%',
        height: 30,
        objectFit: 'contain',
        marginBottom: 8
    },
    portalStatusStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
    },
    portalStatus: {
        fontSize: 7,
        fontWeight: 700,
        color: '#22c55e',
    },
    table: {
        width: '100%',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1pt solid #EEE',
        paddingVertical: 10,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        borderBottom: '2pt solid #b4975a',
    },
    tableCell: {
        fontSize: 9,
        paddingHorizontal: 5,
    },
    infoBox: {
        backgroundColor: '#F3F4F6',
        padding: 20,
        borderRadius: 15,
        marginTop: 20,
    },
    infoTitle: {
        fontSize: 10,
        fontWeight: 900,
        color: '#1a1a1a',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 9,
        color: '#4B5563',
        lineHeight: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTop: '1pt solid #EEE',
        paddingTop: 10,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 8,
        color: '#9CA3AF',
    }
});

interface OwnerReportPDFProps {
    property: Property;
    visits?: any[];
}

const OwnerReportPDF: React.FC<OwnerReportPDFProps> = ({ property, visits = [] }) => {
    // Robust image detection with priority on mainImage
    const mainImg = property.mainImage ||
        property.main_image ||
        (property as any).main_image_url ||
        (property.images && property.images.length > 0 ? property.images[0] : null) ||
        "https://res.cloudinary.com/dmifhcisp/image/upload/v1736113945/magno-logo_pxs2o0.png"; // Use Magno logo as very stable fallback

    const portalsWithLogos = [
        { name: 'Inmuebles24', logo: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519998/6_kasaob.png' },
        { name: 'Lamudi', logo: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519993/4_rm4aiw.png' },
        { name: 'Vivanuncios', logo: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519978/1_qn2civ.png' },
        { name: 'Propiedades.com', logo: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520006/8_wjmrel.png' },
        { name: 'Casas y Terrenos', logo: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768519989/3_zzb5ho.png' },
        { name: 'Inmoxperts', logo: 'https://res.cloudinary.com/dmifhcisp/image/upload/v1768520002/7_hucqn1.png' }
    ];

    const portalsList = (property as any).marketing_data?.portals || portalsWithLogos.map(p => ({ ...p, status: 'published' }));
    const activePortalsCount = portalsList.filter((p: any) => p.status === 'published').length;

    const stats = [
        { label: 'Solicitudes Recibidas', value: visits.length },
        { label: 'Portales Activos', value: activePortalsCount || portalsWithLogos.length },
        { label: 'Días en Mercado', value: Math.floor((new Date().getTime() - new Date(property.created_at || new Date()).getTime()) / (1000 * 3600 * 24)) }
    ];

    return (
        <Document>
            {/* Page 1: General Summary & Marketing */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Image src="https://res.cloudinary.com/dmifhcisp/image/upload/v1736113945/magno-logo_pxs2o0.png" style={styles.logo} />
                        <View style={styles.headerTitleWrap}>
                            <Text style={styles.headerTitle}>REPORTE A PROPIETARIO</Text>
                            <Text style={styles.headerDate}>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                {/* Property Main Image & Highlight */}
                <View style={styles.heroSection}>
                    <Image src={mainImg} style={styles.heroImage} />
                    <View style={styles.heroOverlay}>
                        <Text style={styles.heroTitle}>{property.title?.toUpperCase() || 'PROPIEDAD EN PROMOCIÓN'}</Text>
                        <Text style={styles.heroRef}>REF: {property.ref}</Text>
                    </View>
                </View>

                {/* KPI Grid */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, i) => (
                        <View key={i} style={styles.statCard}>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
                        </View>
                    ))}
                </View>

                {/* Marketing Portals */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DIFUSIÓN EN PORTALES</Text>
                    <View style={styles.portalsGrid}>
                        {portalsList.map((portal: any, i: number) => {
                            const logo = portalsWithLogos.find(p => p.name === portal.name)?.logo ||
                                "https://res.cloudinary.com/dmifhcisp/image/upload/v1736113945/magno-logo_pxs2o0.png";
                            return (
                                <View key={i} style={styles.portalCard}>
                                    <Image src={logo} style={styles.portalLogo} />
                                    <View style={styles.portalStatusStrip}>
                                        <View style={[styles.statusDot, { backgroundColor: portal.status === 'published' ? '#22c55e' : '#fbbf24' }]} />
                                        <Text style={[styles.portalStatus, { color: portal.status === 'published' ? '#22c55e' : '#666' }]}>
                                            {portal.status === 'published' ? 'PUBLICADO' : portal.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Grupo Magno Inmobiliario • Calle Gabriel García Márquez 140, 45030 Zapopan, Jal.</Text>
                    <Text style={[styles.footerText, { marginTop: 4 }]}>grupomagnomexico.com</Text>
                </View>
            </Page>

            {/* Page 2: Interaction History */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Image src="https://res.cloudinary.com/dmifhcisp/image/upload/v1736113945/magno-logo_pxs2o0.png" style={styles.logo} />
                        <View style={styles.headerTitleWrap}>
                            <Text style={styles.headerTitle}>HISTORIAL DE INTERACCIONES</Text>
                            <Text style={styles.headerDate}>{property.ref}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DETALLE DE ACTIVIDAD RECIENTE</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, { flex: 2, fontWeight: 900 }]}>FECHA</Text>
                            <Text style={[styles.tableCell, { flex: 3, fontWeight: 900 }]}>PROSPECTO</Text>
                            <Text style={[styles.tableCell, { flex: 2, fontWeight: 900 }]}>ESTATUS</Text>
                        </View>
                        {visits.length > 0 ? (
                            visits.slice(0, 15).map((visit, i) => (
                                <View key={i} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { flex: 2 }]}>
                                        {new Date(visit.date).toLocaleDateString('es-MX')}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 3 }]}>
                                        {visit.client_name || 'Prospecto Web'}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 2, color: (visit.status === 'completed' || visit.status === 'approved') ? '#b4975a' : (visit.status === 'rejected' || visit.status === 'cancelled' || visit.status === 'declined') ? '#ef4444' : '#666', fontWeight: (visit.status === 'completed' || visit.status === 'approved') ? 700 : 400 }]}>
                                        {(visit.status === 'completed' || visit.status === 'approved') ? 'VISITA REALIZADA' :
                                            (visit.status === 'rejected' || visit.status === 'cancelled' || visit.status === 'declined') ? 'VISITA RECHAZADA' :
                                                'SOLICITUD DE VISITA'}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 7, textAlign: 'center', color: '#999', padding: 20 }]}>
                                    Sin interacciones registradas recientemente
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>PRÓXIMOS PASOS</Text>
                    <Text style={styles.infoText}>
                        Continuamos impulsando su propiedad en todos los canales digitales y redes sociales de Grupo Magno.
                        Nuestro equipo de ventas está dando seguimiento puntual a cada uno de los prospectos listados arriba
                        para concretar la operación en el menor tiempo posible.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Grupo Magno Inmobiliario • gupomagnomexico.com • Página 2</Text>
                </View>
            </Page>
        </Document>
    );
};

export default OwnerReportPDF;
